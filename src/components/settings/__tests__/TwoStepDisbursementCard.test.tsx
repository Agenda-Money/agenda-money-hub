import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { TwoStepDisbursementCard } from "../TwoStepDisbursementCard";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const patch = api.patch as unknown as ReturnType<typeof vi.fn>;

const flags = (over: Record<string, unknown> = {}) => ({
  data: {
    flags: [
      { key: "MONTHLY_DEFAULT_DEDUCTIONS", enabled: true },
      { key: "TWO_STEP_DISBURSEMENT", enabled: false, updatedBy: "SYSTEM", ...over },
    ],
  },
});

function renderCard(canWrite = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TwoStepDisbursementCard canWrite={canWrite} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sw = () => screen.findByRole("switch", { name: "Require a second admin" });

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(flags());
  patch.mockResolvedValue({ data: {} });
});

describe("reading the setting", () => {
  it("shows off when the flag is off", async () => {
    renderCard();

    expect(await sw()).not.toBeChecked();
    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(screen.getByText("One admin's approval sends the money.")).toBeInTheDocument();
  });

  it("shows on, and where waiting loans are, when the flag is on", async () => {
    get.mockResolvedValue(flags({ enabled: true }));
    renderCard();

    expect(await sw()).toBeChecked();
    expect(screen.getByText("On")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /loans waiting for a second approval/i })).toHaveAttribute(
      "href",
      "/loans/second-approval",
    );
  });

  it("treats a flag that has never been set as off", async () => {
    get.mockResolvedValue({ data: { flags: [] } });
    renderCard();

    expect(await sw()).not.toBeChecked();
  });

  it("says who changed it last and when, but not for the system's own seed", async () => {
    get.mockResolvedValue(flags({ enabled: true, updatedBy: "charles@agendamoney.com", updatedAt: "2026-10-08T09:30:00.000Z" }));
    renderCard();

    expect(await screen.findByTestId("two-step-last-change")).toHaveTextContent("Last changed by charles@agendamoney.com");
  });

  it("says nothing about a change when only the system has set it", async () => {
    renderCard();
    await sw();
    expect(screen.queryByTestId("two-step-last-change")).not.toBeInTheDocument();
  });

  it("says so if the setting cannot be loaded, and offers no switch", async () => {
    get.mockRejectedValue(new Error("down"));
    renderCard();

    expect(await screen.findByText("Could not load this setting.")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

describe("turning it on", () => {
  it("asks first, and says what changes", async () => {
    renderCard();

    fireEvent.click(await sw());

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Turn on two-step disbursement?");
    expect(dialog).toHaveTextContent("A different admin must approve it before any money is sent");
    expect(patch).not.toHaveBeenCalled();
  });

  it("turns it on after confirming", async () => {
    renderCard();

    fireEvent.click(await sw());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/settings/feature-flags/TWO_STEP_DISBURSEMENT", { enabled: true }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Loans now need two different admins")));
  });

  it("does nothing if cancelled", async () => {
    renderCard();

    fireEvent.click(await sw());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(patch).not.toHaveBeenCalled();
  });
});

describe("turning it off", () => {
  beforeEach(() => get.mockResolvedValue(flags({ enabled: true })));

  it("asks first, and warns that waiting first approvals will then be sent by one approval", async () => {
    renderCard();

    fireEvent.click(await sw());

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Turn off two-step disbursement?");
    expect(dialog).toHaveTextContent("a single approval sends the money");
    expect(dialog).toHaveTextContent("already have a first approval will be sent by whoever approves next");
  });

  it("turns it off after confirming", async () => {
    renderCard();

    fireEvent.click(await sw());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/settings/feature-flags/TWO_STEP_DISBURSEMENT", { enabled: false }),
    );
  });
});

describe("who may change it", () => {
  it("is read-only for someone without write access", async () => {
    renderCard(false);

    expect(await sw()).toBeDisabled();
  });
});

describe("when the server refuses", () => {
  it("shows its reason", async () => {
    patch.mockRejectedValue({ response: { data: { message: "Forbidden" } } });
    renderCard();

    fireEvent.click(await sw());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Forbidden"));
  });
});
