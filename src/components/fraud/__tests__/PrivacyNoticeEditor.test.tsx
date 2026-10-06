import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { PrivacyNoticeEditor } from "../PrivacyNoticeEditor";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;

const SHORT =
  "We note the device you use to spot fraud and protect honest customers. Kept for 12 months. Contact dpo@example.com.";
const POLICY =
  "We collect a random device ID, your IP address and browser details to prevent fraud. We keep them for 12 months and you may object by contacting dpo@example.com.";

const LIMITS = { shortNotice: { min: 40, max: 700 }, policyText: { min: 80, max: 6000 } };

function notice(over: Record<string, unknown> = {}) {
  return {
    draft: { shortNotice: SHORT, policyText: POLICY },
    draftUpdatedAt: "2026-10-06T10:00:00.000Z",
    draftUpdatedBy: "charles",
    published: null,
    hasUnpublishedChanges: true,
    placeholders: [],
    history: [],
    limits: LIMITS,
    ...over,
  };
}

const serve = (n = notice()) => get.mockResolvedValue({ data: { data: n } });

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PrivacyNoticeEditor />
    </QueryClientProvider>,
  );
}

const shortBox = () => screen.findByLabelText(/short notice/i) as Promise<HTMLTextAreaElement>;
const policyBox = () => screen.findByLabelText(/full wording/i) as Promise<HTMLTextAreaElement>;

const published = (version = 1) => ({
  shortNotice: SHORT,
  policyText: POLICY,
  version,
  publishedAt: "2026-10-05T09:00:00.000Z",
  publishedBy: "charles",
});

beforeEach(() => {
  vi.clearAllMocks();
  put.mockResolvedValue({ data: {} });
  post.mockResolvedValue({ data: {} });
});

describe("loading", () => {
  it("fills the boxes with the saved draft", async () => {
    serve();
    renderEditor();

    expect((await shortBox()).value).toBe(SHORT);
    expect((await policyBox()).value).toBe(POLICY);
  });

  it("says so when nothing is published, and that capture is blocked", async () => {
    serve();
    renderEditor();

    expect(await screen.findByTestId("notice-status")).toHaveTextContent(/not published/i);
    expect(screen.getByTestId("notice-status")).toHaveTextContent(/cannot be turned on until this is/i);
  });

  it("says who published which version and when", async () => {
    serve(
      notice({
        published: published(2),
        hasUnpublishedChanges: false,
        history: [
          { version: 1, publishedAt: "2026-10-01T09:00:00.000Z", publishedBy: "ama" },
          { version: 2, publishedAt: "2026-10-05T09:00:00.000Z", publishedBy: "charles" },
        ],
      }),
    );
    renderEditor();

    expect(await screen.findByTestId("notice-status")).toHaveTextContent("Published as version 2 by charles");
    expect(screen.getByText("Version 1")).toBeInTheDocument();
  });

  it("shows the server's message if it cannot load", async () => {
    get.mockRejectedValue({ response: { data: { message: "Not allowed" } } });
    renderEditor();

    expect(await screen.findByText("Not allowed")).toBeInTheDocument();
  });
});

describe("the preview", () => {
  it("shows the wording where it will appear, from what is in the box", async () => {
    serve();
    renderEditor();

    const preview = await screen.findByTestId("notice-preview");
    expect(within(preview).getByText("Enter your phone number")).toBeInTheDocument();
    expect(within(preview).getByTestId("device-notice")).toHaveTextContent(SHORT);
  });

  it("follows unsaved edits as they are typed", async () => {
    serve();
    renderEditor();

    fireEvent.change(await shortBox(), {
      target: { value: "A different notice that is certainly long enough to be valid." },
    });

    expect(within(screen.getByTestId("notice-preview")).getByTestId("device-notice")).toHaveTextContent(
      "A different notice that is certainly long enough",
    );
  });

  it("opens the full wording from the preview", async () => {
    serve();
    renderEditor();

    const preview = await screen.findByTestId("notice-preview");
    fireEvent.click(within(preview).getByRole("button", { name: "Privacy" }));

    expect(await screen.findByTestId("policy-text")).toHaveTextContent("random device ID");
  });
});

describe("blanks", () => {
  const withBlank = notice({
    draft: { shortNotice: SHORT.replace("dpo@example.com", "[DPO email / phone]"), policyText: POLICY },
    placeholders: ["[DPO email / phone]"],
  });

  it("warns about each blank and blocks publishing", async () => {
    serve(withBlank);
    renderEditor();

    expect(await screen.findByTestId("notice-blanks")).toHaveTextContent("[DPO email / phone]");
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText("Fill in the blanks first.")).toBeInTheDocument();
  });

  it("notices a blank as it is typed, before anything is saved", async () => {
    serve();
    renderEditor();

    fireEvent.change(await policyBox(), { target: { value: POLICY + " Ask [lawful basis to confirm]." } });

    expect(screen.getByTestId("notice-blanks")).toHaveTextContent("[lawful basis to confirm]");
  });

  it("says nothing when there are no blanks", async () => {
    serve();
    renderEditor();

    await shortBox();
    expect(screen.queryByTestId("notice-blanks")).not.toBeInTheDocument();
  });
});

describe("saving", () => {
  it("is disabled until something changes", async () => {
    serve();
    renderEditor();

    await shortBox();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("sends both texts and says nothing is shown until published", async () => {
    serve();
    renderEditor();

    const edited = SHORT + " Edited.";
    fireEvent.change(await shortBox(), { target: { value: edited } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/admin/fraud/privacy-notice", { shortNotice: edited, policyText: POLICY }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("nothing new until you publish")),
    );
  });

  it("refuses text that is too short and says how short", async () => {
    serve();
    renderEditor();

    fireEvent.change(await shortBox(), { target: { value: "too short" } });

    expect(screen.getByText("At least 40 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("refuses text that is too long", async () => {
    serve();
    renderEditor();

    fireEvent.change(await shortBox(), { target: { value: "x".repeat(701) } });

    expect(screen.getByText("At most 700 characters")).toBeInTheDocument();
  });

  it("shows the server's reason if the save fails", async () => {
    serve();
    put.mockRejectedValue({ response: { data: { message: "shortNotice is too short" } } });
    renderEditor();

    fireEvent.change(await shortBox(), { target: { value: SHORT + " Edited." } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("shortNotice is too short"));
  });
});

describe("publishing", () => {
  it("is enabled for a saved draft with no blanks", async () => {
    serve();
    renderEditor();

    await shortBox();
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("is blocked while there are unsaved edits", async () => {
    serve();
    renderEditor();

    fireEvent.change(await shortBox(), { target: { value: SHORT + " Edited." } });

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText("Save your changes first.")).toBeInTheDocument();
  });

  it("is blocked when the draft is already what customers see", async () => {
    serve(notice({ published: published(1), hasUnpublishedChanges: false }));
    renderEditor();

    await shortBox();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText("Nothing has changed since the last publish.")).toBeInTheDocument();
  });

  it("asks first, saying which version it will become", async () => {
    serve();
    renderEditor();

    await shortBox();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("version 1");
    expect(post).not.toHaveBeenCalled();
  });

  it("publishes after confirming", async () => {
    serve();
    renderEditor();

    await shortBox();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/admin/fraud/privacy-notice/publish"));
  });

  it("shows the server's reason if it refuses", async () => {
    serve();
    post.mockRejectedValue({ response: { data: { message: "Someone else just published." } } });
    renderEditor();

    await shortBox();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Someone else just published."));
  });
});
