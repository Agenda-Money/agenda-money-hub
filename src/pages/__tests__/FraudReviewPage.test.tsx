import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FraudReviewPage from "../FraudReviewPage";
import api from "@/lib/api";
import { precisionLabel, ruleTitle } from "@/lib/fraud";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;

const flag = (over: Record<string, unknown> = {}) => ({
  _id: "f1",
  rule: "REFERENCE_IS_DEFAULTER",
  severity: "medium",
  subjectType: "user",
  subjectKey: "233541000001",
  msisdn: "233541000001",
  summary: "Ama named 233541000002 as a reference, and that number is in default",
  evidence: { applicantName: "Ama", referenceMsisdn: "233541000002" },
  status: "OPEN",
  shadow: false,
  createdAt: "2026-10-06T09:00:00.000Z",
  ...over,
});

function respondWith(rows: unknown[], total = rows.length) {
  get.mockImplementation((url: string) => {
    if (url.includes("scorecard")) return Promise.resolve({ data: { data: [] } });
    return Promise.resolve({ data: { success: true, rows, total } });
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FraudReviewPage />
    </QueryClientProvider>,
  );
}

/** Radix tabs switch on mouse-down, so a plain click does nothing in jsdom. */
function openTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ data: { success: true } });
});

describe("the queue", () => {
  it("shows an open flag in plain English, not as a rule code", async () => {
    respondWith([flag()]);
    renderPage();

    expect(await screen.findByText("Reference is in default")).toBeTruthy();
    expect(screen.queryByText("REFERENCE_IS_DEFAULTER")).toBeNull();
    expect(screen.getByText(/named 233541000002 as a reference/)).toBeTruthy();
  });

  it("asks for open flags and hides rules still being tested by default", async () => {
    respondWith([flag()]);
    renderPage();
    await screen.findByText("Reference is in default");

    const params = get.mock.calls[0][1].params;
    expect(params.status).toBe("OPEN");
    expect(params.includeShadow).toBeUndefined();
  });

  it("includes rules still being tested only when asked", async () => {
    respondWith([flag({ shadow: true })]);
    renderPage();
    await screen.findByText("Reference is in default");

    fireEvent.click(screen.getByLabelText(/Include rules still being tested/i));

    await waitFor(() => {
      const last = get.mock.calls[get.mock.calls.length - 1][1].params;
      expect(last.includeShadow).toBe("true");
    });
  });

  it("labels a testing flag so nobody mistakes it for a live one", async () => {
    respondWith([flag({ shadow: true })]);
    renderPage();
    expect(await screen.findByText("Testing")).toBeTruthy();
  });

  it("explains an empty queue rather than showing nothing", async () => {
    respondWith([]);
    renderPage();
    expect(await screen.findByText(/Nothing is waiting/)).toBeTruthy();
  });

  it("shows the server's own message when the queue cannot load", async () => {
    get.mockRejectedValue({ response: { data: { message: "Forbidden" } } });
    renderPage();
    expect(await screen.findByText("Forbidden")).toBeTruthy();
  });

  it("keeps the evidence out of the way until it is asked for", async () => {
    respondWith([flag()]);
    renderPage();
    await screen.findByText("Reference is in default");

    expect(screen.queryByTestId("flag-evidence")).toBeNull();
    fireEvent.click(screen.getByText("Show evidence"));
    expect(screen.getByTestId("flag-evidence").textContent).toContain("referenceMsisdn");
  });
});

describe("deciding a flag", () => {
  async function openDialog(buttonName: RegExp) {
    respondWith([flag()]);
    renderPage();
    await screen.findByText("Reference is in default");
    fireEvent.click(within(screen.getByTestId("flag-card")).getByRole("button", { name: buttonName }));
    return screen.findByRole("dialog");
  }

  it("will not let a dismissal through without a reason", async () => {
    const dialog = await openDialog(/^Dismiss$/);
    const submit = within(dialog).getByRole("button", { name: /^Dismiss$/ }) as HTMLButtonElement;

    expect(submit.disabled).toBe(true);

    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "   " } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Her mother" } });
    expect(submit.disabled).toBe(false);
  });

  it("sends the dismissal with its reason", async () => {
    const dialog = await openDialog(/^Dismiss$/);
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Her mother" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Dismiss$/ }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/fraud/flags/f1/dismiss", { note: "Her mother" }),
    );
  });

  it("lets a confirmation go without a note", async () => {
    const dialog = await openDialog(/Confirm fraud/);
    fireEvent.click(within(dialog).getByRole("button", { name: /Confirm fraud/ }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/fraud/flags/f1/confirm", { note: undefined }),
    );
  });

  it("closes the dialog without sending anything when cancelled", async () => {
    const dialog = await openDialog(/^Dismiss$/);
    fireEvent.click(within(dialog).getByRole("button", { name: /Cancel/ }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(post).not.toHaveBeenCalled();
  });

  it("does not carry a half-typed reason over to the next flag", async () => {
    const dialog = await openDialog(/^Dismiss$/);
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "half typed" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Cancel/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(within(screen.getByTestId("flag-card")).getByRole("button", { name: /^Dismiss$/ }));
    const reopened = await screen.findByRole("dialog");

    expect((within(reopened).getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });
});

describe("decided flags", () => {
  it("shows who decided and why, with no buttons left to press", async () => {
    get.mockImplementation(() =>
      Promise.resolve({
        data: {
          success: true,
          total: 1,
          rows: [
            flag({
              status: "DISMISSED",
              decidedByName: "Sylvia",
              decisionNote: "Her mother",
              decidedAt: "2026-10-06T10:00:00.000Z",
            }),
          ],
        },
      }),
    );
    renderPage();
    openTab("Dismissed");

    expect(await screen.findByText(/by Sylvia/)).toBeTruthy();
    // Proves the tab really switched: the mock answers every request the same
    // way, so the rows on screen alone could not tell.
    const statuses = get.mock.calls.map((c) => c[1]?.params?.status).filter(Boolean);
    expect(statuses).toContain("DISMISSED");
    expect(screen.getByText("Her mother")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Confirm fraud/ })).toBeNull();
  });
});

describe("the scorecard", () => {
  it("marks a hit rate built on few decisions as untrustworthy", async () => {
    get.mockImplementation((url: string) =>
      url.includes("scorecard")
        ? Promise.resolve({
            data: {
              data: [
                { rule: "REFERENCE_SHARED", live: false, total: 8, open: 4, confirmed: 3, dismissed: 1, decided: 4, precision: 0.75 },
              ],
            },
          })
        : Promise.resolve({ data: { rows: [], total: 0 } }),
    );
    renderPage();
    openTab("Rule scorecard");

    expect(await screen.findByText(/75% \(too few to trust\)/)).toBeTruthy();
    expect(screen.getByText("Testing")).toBeTruthy();
  });
});

describe("wording helpers", () => {
  it("falls back to something readable for a rule the hub has not been taught", () => {
    expect(ruleTitle("SOMETHING_NEW")).toBe("something new");
  });

  it("says so when nothing has been decided, rather than showing 0%", () => {
    expect(precisionLabel({ precision: null, decided: 0 })).toBe("No decisions yet");
  });

  it("drops the warning once there are enough decisions", () => {
    expect(precisionLabel({ precision: 0.8, decided: 40 })).toBe("80%");
  });
});
