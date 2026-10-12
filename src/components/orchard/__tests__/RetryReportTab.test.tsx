import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetryReportTab } from "../RetryReportTab";
import * as orchard from "@/api/orchard.api";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/api/orchard.api", () => ({
  getRetrySchedule: vi.fn(),
  setRetrySchedule: vi.fn(),
  getRetryReport: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const getSchedule = orchard.getRetrySchedule as unknown as ReturnType<typeof vi.fn>;
const setSchedule = orchard.setRetrySchedule as unknown as ReturnType<typeof vi.fn>;
const getReport = orchard.getRetryReport as unknown as ReturnType<typeof vi.fn>;
const auth = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RetryReportTab />
    </QueryClientProvider>,
  );
}

const sw = () => screen.findByRole("switch", { name: "Run the retry report on a schedule" });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockReturnValue({ canWrite: true });
  getSchedule.mockResolvedValue({ enabled: false, reportOnly: true });
  setSchedule.mockResolvedValue({ enabled: true, reportOnly: true });
});

describe("the schedule switch", () => {
  it("starts off, and says the report never charges anyone", async () => {
    renderTab();
    expect(await sw()).not.toBeChecked();
    expect(screen.getByText(/never charges a customer/i)).toBeInTheDocument();
  });

  it("turns the scheduled report on", async () => {
    renderTab();
    fireEvent.click(await sw());
    await waitFor(() => expect(setSchedule).toHaveBeenCalledWith(true));
  });

  it("cannot be changed by someone with read-only access", async () => {
    auth.mockReturnValue({ canWrite: false });
    renderTab();
    expect(await sw()).toBeDisabled();
  });

  it("says who last changed it", async () => {
    getSchedule.mockResolvedValue({ enabled: true, reportOnly: true, updatedBy: "ben@agenda.com", updatedAt: "2026-10-12T10:00:00Z" });
    renderTab();
    expect(await screen.findByText(/Last changed by ben@agenda.com/)).toBeInTheDocument();
  });
});

describe("run it now", () => {
  const plan = {
    asOf: "2026-10-12T13:05:00Z",
    considered: 40,
    wouldRetry: [
      { uniqRefId: "AD-1", loanReference: "AM-1", customer: "…1234", verdict: "WOULD_RETRY", reason: "ok", chargeAmount: 50, outstanding: 80 },
    ],
    skipped: { LOAN_FINISHED: 30, ATTEMPTED_RECENTLY: 8 },
    needsAPerson: [
      { uniqRefId: "AD-2", loanReference: "AM-2", customer: "…9999", verdict: "SKIP", code: "TOO_MANY_FAILURES", reason: "12 failures in a row", outstanding: 20 },
    ],
    statusChecks: 3,
    verdicts: [],
  };

  it("lists who would be retried, who needs a person and why the rest were left alone", async () => {
    getReport.mockResolvedValue(plan);
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /run report now/i }));

    expect(await screen.findByText("…1234")).toBeInTheDocument();
    expect(screen.getByText("₵50.00")).toBeInTheDocument();
    expect(screen.getByText("12 failures in a row")).toBeInTheDocument();
    expect(screen.getByText("Loan is already finished")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument();
  });

  it("says so when nothing qualifies", async () => {
    getReport.mockResolvedValue({ ...plan, wouldRetry: [], needsAPerson: [], skipped: {} });
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /run report now/i }));
    expect(await screen.findByText(/No mandate qualifies/)).toBeInTheDocument();
  });
});
