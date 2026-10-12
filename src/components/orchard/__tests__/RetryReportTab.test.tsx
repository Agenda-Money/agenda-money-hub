import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetryReportTab } from "../RetryReportTab";
import * as orchard from "@/api/orchard.api";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/api/orchard.api", () => ({
  getRetrySchedule: vi.fn(),
  setRetrySchedule: vi.fn(),
  setRetryLive: vi.fn(),
  getRetryRuns: vi.fn(),
  getRetryReport: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fn = (f: unknown) => f as ReturnType<typeof vi.fn>;
const getSchedule = fn(orchard.getRetrySchedule);
const setSchedule = fn(orchard.setRetrySchedule);
const setLive = fn(orchard.setRetryLive);
const getRuns = fn(orchard.getRetryRuns);
const getReport = fn(orchard.getRetryReport);
const auth = fn(useAuth);

const schedule = (over: Record<string, unknown> = {}) => ({
  enabled: false,
  reportOnly: true,
  live: { enabled: false },
  todaySlotHour: 2,
  upcomingSlots: [
    { date: "2026-10-14", hour: 2 },
    { date: "2026-10-15", hour: 3 },
    { date: "2026-10-16", hour: 4 },
    { date: "2026-10-17", hour: 5 },
  ],
  ...over,
});

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RetryReportTab />
    </QueryClientProvider>,
  );
}

const liveSwitch = () => screen.findByRole("switch", { name: "Charge customers with the automatic retry" });
const reportSwitch = () => screen.findByRole("switch", { name: "Run the retry report on a schedule" });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockReturnValue({ canWrite: true });
  getSchedule.mockResolvedValue(schedule());
  getRuns.mockResolvedValue([]);
  setSchedule.mockResolvedValue({ enabled: true });
  setLive.mockResolvedValue({ enabled: true });
});

describe("the live switch, which charges customers", () => {
  it("starts off, and shows the retry hour moving a day at a time", async () => {
    renderTab();
    expect(await liveSwitch()).not.toBeChecked();
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(screen.getByText("02:00")).toBeInTheDocument();
    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(screen.getByText("05:00")).toBeInTheDocument();
  });

  it("does not turn on when clicked: it asks first, and nothing is sent until confirmed", async () => {
    renderTab();
    fireEvent.click(await liveSwitch());

    expect(await screen.findByText("Start charging customers automatically?")).toBeInTheDocument();
    expect(setLive).not.toHaveBeenCalled();
  });

  it("stays off if the question is declined", async () => {
    renderTab();
    fireEvent.click(await liveSwitch());
    fireEvent.click(await screen.findByRole("button", { name: "Not yet" }));

    await waitFor(() => expect(screen.queryByText("Start charging customers automatically?")).not.toBeInTheDocument());
    expect(setLive).not.toHaveBeenCalled();
  });

  it("turns on once confirmed, and only the live flag is touched", async () => {
    renderTab();
    fireEvent.click(await liveSwitch());
    fireEvent.click(await screen.findByRole("button", { name: "Turn on and charge" }));

    await waitFor(() => expect(setLive).toHaveBeenCalledWith(true));
    expect(setSchedule).not.toHaveBeenCalled();
  });

  it("turns off at once, with no question: stopping is never in doubt", async () => {
    getSchedule.mockResolvedValue(schedule({ live: { enabled: true, updatedBy: "ben@agenda.com" } }));
    renderTab();
    fireEvent.click(await liveSwitch());

    await waitFor(() => expect(setLive).toHaveBeenCalledWith(false));
    expect(screen.queryByText("Start charging customers automatically?")).not.toBeInTheDocument();
  });

  it("says plainly that it is charging when on, and who turned it on", async () => {
    getSchedule.mockResolvedValue(schedule({ live: { enabled: true, updatedBy: "ben@agenda.com" } }));
    renderTab();
    expect(await screen.findByText("ON · charging customers")).toBeInTheDocument();
    expect(screen.getByText(/Last changed by ben@agenda.com/)).toBeInTheDocument();
  });

  it("cannot be changed by someone with read-only access", async () => {
    auth.mockReturnValue({ canWrite: false });
    renderTab();
    expect(await liveSwitch()).toBeDisabled();
    expect(await reportSwitch()).toBeDisabled();
  });

  it("lists the limits it works within", async () => {
    renderTab();
    await liveSwitch();
    expect(screen.getByText(/Never past the mandate's end date/)).toBeInTheDocument();
    expect(screen.getByText(/At most 30 debits an hour/)).toBeInTheDocument();
  });
});

describe("the report switch", () => {
  it("turns the report on without a question: it cannot move money", async () => {
    renderTab();
    fireEvent.click(await reportSwitch());
    await waitFor(() => expect(setSchedule).toHaveBeenCalledWith(true));
    expect(setLive).not.toHaveBeenCalled();
  });
});

describe("what it has done", () => {
  const run = (over: Record<string, unknown> = {}) => ({
    _id: "r1",
    mode: "LIVE",
    slotHour: 2,
    considered: 40,
    wouldRetry: 3,
    attempts: [
      { customer: "…1111", loanReference: "AM-1", amount: 50, outcome: "SUBMITTED" },
      { customer: "…2222", loanReference: "AM-2", amount: 75, outcome: "REFUSED", detail: "158 Not allowed" },
    ],
    capped: false,
    createdAt: "2026-10-14T05:05:00Z",
    ...over,
  });

  it("shows each run, how many were charged, and who on request", async () => {
    getRuns.mockResolvedValue([run()]);
    renderTab();

    const row = (await screen.findByText("Live")).closest("tr")!;
    expect(within(row).getByText("1")).toBeInTheDocument(); // charged
    expect(within(row).getByText("1 not submitted")).toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: "Who" }));
    expect(await screen.findByText("…1111 · AM-1")).toBeInTheDocument();
    expect(screen.getByText("Orchard refused")).toBeInTheDocument();
  });

  it("says when a run stopped itself", async () => {
    getRuns.mockResolvedValue([run({ abortedReason: "5 requests in a row were refused." })]);
    renderTab();
    expect(await screen.findByText("Stopped itself")).toBeInTheDocument();
  });

  it("says so when there are no runs yet", async () => {
    renderTab();
    expect(await screen.findByText("Nothing yet.")).toBeInTheDocument();
  });
});

describe("check who qualifies right now", () => {
  const plan = {
    asOf: "2026-10-12T13:05:00Z",
    considered: 40,
    wouldRetry: [
      { uniqRefId: "AD-1", loanReference: "AM-1", customer: "…1234", verdict: "WOULD_RETRY", reason: "ok", chargeAmount: 50, outstanding: 80 },
    ],
    skipped: { LOAN_FINISHED: 30, MANDATE_ENDED: 4 },
    needsAPerson: [],
    statusChecks: 3,
    verdicts: [],
  };

  it("lists who would be retried and explains the skips, including ended mandates", async () => {
    getReport.mockResolvedValue(plan);
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /run report now/i }));

    expect(await screen.findByText("…1234")).toBeInTheDocument();
    expect(screen.getByText("₵50.00")).toBeInTheDocument();
    expect(screen.getByText("Loan is already finished")).toBeInTheDocument();
    expect(screen.getByText("Mandate has ended, needs renewing")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument();
  });

  it("says so when nothing qualifies", async () => {
    getReport.mockResolvedValue({ ...plan, wouldRetry: [], skipped: {} });
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /run report now/i }));
    expect(await screen.findByText(/No mandate qualifies/)).toBeInTheDocument();
  });
});
