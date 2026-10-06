import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { SignalsPanel } from "../SignalsPanel";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;

const row = (rule: string, over: Record<string, unknown> = {}) => ({
  rule,
  live: false,
  pinned: false,
  needsDeviceCapture: false,
  hiddenOpen: 0,
  shownOpen: 0,
  ...over,
});

function serve(
  capture: Partial<{ enabled: boolean; noticePublished: boolean; noticeVersion: number | null; sightings: number }> = {},
  rules = [
    row("REFERRER_IN_DEFAULT", { hiddenOpen: 16 }),
    row("REFERENCE_IS_DEFAULTER", { live: true, pinned: true, shownOpen: 3 }),
    row("DEVICE_SHARED", { needsDeviceCapture: true }),
  ],
) {
  get.mockResolvedValue({
    data: {
      data: {
        deviceCapture: { enabled: false, noticePublished: true, noticeVersion: 1, sightings: 0, ...capture },
        rules,
      },
    },
  });
}

function renderPanel(onOpenNotice = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <SignalsPanel onOpenNotice={onOpenNotice} />
    </QueryClientProvider>,
  );
  return { onOpenNotice };
}

const confirm = async () =>
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirm" }));

beforeEach(() => {
  vi.clearAllMocks();
  put.mockResolvedValue({ data: { data: { flagsMoved: 0 } } });
});

describe("device capture", () => {
  it("cannot be turned on while no notice is published, and says why", async () => {
    serve({ noticePublished: false, noticeVersion: null });
    renderPanel();

    const sw = await screen.findByRole("switch", { name: "Device capture" });
    expect(sw).toBeDisabled();
    expect(screen.getByText(/cannot be turned on until customers have been told/i)).toBeInTheDocument();
    expect(screen.getByText("Not published")).toBeInTheDocument();
  });

  it("offers a way to the privacy notice", async () => {
    serve({ noticePublished: false, noticeVersion: null });
    const { onOpenNotice } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Open privacy notice" }));

    expect(onOpenNotice).toHaveBeenCalled();
  });

  it("asks before turning on, naming the notice customers will see", async () => {
    serve({ noticePublished: true, noticeVersion: 3 });
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: "Device capture" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Turn on device capture?");
    expect(dialog).toHaveTextContent("version 3");
    expect(put).not.toHaveBeenCalled();
  });

  it("turns it on only after confirming", async () => {
    serve({ noticePublished: true, noticeVersion: 3 });
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: "Device capture" }));
    await confirm();

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/admin/fraud/signals/device-capture", { enabled: true }),
    );
  });

  it("does nothing if the confirmation is cancelled", async () => {
    serve({ noticePublished: true });
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: "Device capture" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(put).not.toHaveBeenCalled();
  });

  it("can be turned off even with no notice published", async () => {
    serve({ enabled: true, noticePublished: false, noticeVersion: null });
    renderPanel();

    const sw = await screen.findByRole("switch", { name: "Device capture" });
    expect(sw).not.toBeDisabled();
    fireEvent.click(sw);
    await confirm();

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/admin/fraud/signals/device-capture", { enabled: false }),
    );
  });

  it("shows the server's reason when it refuses", async () => {
    serve({ noticePublished: true });
    put.mockRejectedValue({ response: { data: { message: "Publish the privacy notice first." } } });
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: "Device capture" }));
    await confirm();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Publish the privacy notice first."));
  });

  it("reports how much has been recorded", async () => {
    serve({ enabled: true, sightings: 42 });
    renderPanel();

    expect(await screen.findByText("42 device sightings")).toBeInTheDocument();
  });
});

describe("rules", () => {
  it("lists each rule with its state and what is waiting", async () => {
    serve();
    renderPanel();

    const waiting = await screen.findByTestId("signal-REFERRER_IN_DEFAULT");
    expect(waiting).toHaveTextContent("Testing");
    expect(waiting).toHaveTextContent("16 open findings waiting");

    const live = screen.getByTestId("signal-REFERENCE_IS_DEFAULTER");
    expect(live).toHaveTextContent("Live");
    expect(live).toHaveTextContent("3 open in the queue");
  });

  it("says how many findings will join the queue before a rule is turned on", async () => {
    serve();
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: /referred by a customer in default/i }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "16 open findings that are hidden now will join the review queue",
    );
    expect(put).not.toHaveBeenCalled();
  });

  it("turns a rule on after confirming, and says how many joined", async () => {
    serve();
    put.mockResolvedValue({ data: { data: { flagsMoved: 16 } } });
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: /referred by a customer in default/i }));
    await confirm();

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/admin/fraud/signals/rules/REFERRER_IN_DEFAULT", { live: true }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("16 waiting flags have joined")),
    );
  });

  it("says plainly that decisions are kept when a rule goes back to testing", async () => {
    serve({}, [row("AGENT_RISK", { live: true, shownOpen: 4 })]);
    renderPanel();

    fireEvent.click(await screen.findByRole("switch", { name: /agent book looks unusual/i }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Decisions already made are kept");
  });

  it("does not let a rule that is live in the code be switched off", async () => {
    serve();
    renderPanel();

    expect(await screen.findByRole("switch", { name: /reference is in default/i })).toBeDisabled();
    expect(screen.getByText("Live in code")).toBeInTheDocument();
  });

  it("marks the device rules as waiting while capture is off", async () => {
    serve();
    renderPanel();

    expect(await screen.findByTestId("signal-DEVICE_SHARED")).toHaveTextContent("Waiting for device capture");
  });

  it("does not mark them waiting once capture is on", async () => {
    serve({ enabled: true });
    renderPanel();

    expect(await screen.findByTestId("signal-DEVICE_SHARED")).not.toHaveTextContent("Waiting for device capture");
  });
});

describe("loading", () => {
  it("shows the server's message if the signals cannot be loaded", async () => {
    get.mockRejectedValue({ response: { data: { message: "Not allowed" } } });
    renderPanel();

    expect(await screen.findByText("Not allowed")).toBeInTheDocument();
  });
});
