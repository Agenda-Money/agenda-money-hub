import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrchardPage from "../OrchardPage";
import * as orchard from "@/api/orchard.api";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/api/orchard.api", () => ({
  listOrchardMandates: vi.fn(),
  getMandateExpiryRisk: vi.fn(),
  suspendOrchardMandate: vi.fn(),
  resumeOrchardMandate: vi.fn(),
  cancelOrchardMandate: vi.fn(),
  resendOrchardOtp: vi.fn(),
  syncOrchardMandate: vi.fn(),
  forceRetryOrchardDebit: vi.fn(),
  checkOrchardWalletBalance: vi.fn(),
  getRepaymentTiming: vi.fn(),
  getRetryReport: vi.fn(),
  getRetrySchedule: vi.fn(),
  setRetrySchedule: vi.fn(),
}));

const list = orchard.listOrchardMandates as unknown as ReturnType<typeof vi.fn>;
const risk = orchard.getMandateExpiryRisk as unknown as ReturnType<typeof vi.fn>;

const mandate = (over: Record<string, unknown> = {}) => ({
  _id: String(Math.random()),
  msisdn: "233541000001",
  network: "MTN",
  uniqRefId: "AD-1",
  status: "ACTIVE",
  currentLoanReference: "AM-1",
  currentDebitAmount: 50,
  cycle: "DLY",
  retryCount: 0,
  totalDebitsSuccessful: 0,
  totalDebitsFailed: 0,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  customerName: "Ama Test",
  loanStatus: "OVERDUE",
  outstanding: 120,
  expiry: { state: "ENDED", daysLeft: -2 },
  endDate: "2026-10-10T00:00:00Z",
  ...over,
});

const emptyRisk = {
  asOf: "x",
  withinDays: 14,
  summary: {
    endedWithMoneyOwed: { mandates: 0, owed: 0 },
    endingSoonWithMoneyOwed: { mandates: 0, owed: 0 },
    within3Days: 0,
    within7Days: 0,
  },
  rows: [],
};

function renderPage(path = "/admin/orchard/mandates") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/orchard/:tab" element={<OrchardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ canWrite: true });
  list.mockResolvedValue([
    mandate(),
    mandate({ _id: "b", msisdn: "233541000002", status: "CANCELLED", customerName: "Kofi Test" }),
  ]);
  risk.mockResolvedValue(emptyRisk);
});

describe("Orchard mandates search", () => {
  it("shows the customer, the loan status, what is owed and that the mandate has ended", async () => {
    renderPage();
    expect(await screen.findAllByText("Ama Test")).not.toHaveLength(0);
    expect(screen.getAllByText("OVERDUE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₵120.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Ended 2 days ago, money still owed")).toBeInTheDocument();
  });

  it("sends what is typed to the server, once typing pauses", async () => {
    renderPage();
    await screen.findAllByText("Ama Test");

    fireEvent.change(screen.getByLabelText("Search mandates"), { target: { value: "ama" } });

    await waitFor(() => expect(list).toHaveBeenCalledWith({ status: "", search: "ama" }));
    expect(list.mock.calls.filter(([a]: any[]) => a?.search === "a" || a?.search === "am")).toHaveLength(0);
  });

  it("filters by status chip and shows the counts", async () => {
    renderPage();
    await screen.findAllByText("Ama Test");

    const group = screen.getByRole("group", { name: "Filter by status" });
    expect(within(group).getByRole("button", { name: /^All/ })).toHaveTextContent("2");
    fireEvent.click(within(group).getByRole("button", { name: /^Cancelled/ }));

    await waitFor(() => expect(list).toHaveBeenCalledWith({ status: "CANCELLED", search: "" }));
  });

  it("says so when nothing matches, and a clear button empties the search", async () => {
    list.mockResolvedValue([]);
    renderPage();
    fireEvent.change(await screen.findByLabelText("Search mandates"), { target: { value: "zzz" } });
    expect(await screen.findByText(/No mandate matches/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(screen.getByLabelText("Search mandates")).toHaveValue("");
  });
});

describe("Orchard running-out warning", () => {
  it("shows a count on the tab and a warning on the overview when mandates have run out owing money", async () => {
    risk.mockResolvedValue({
      ...emptyRisk,
      summary: {
        ...emptyRisk.summary,
        endedWithMoneyOwed: { mandates: 3, owed: 450 },
        endingSoonWithMoneyOwed: { mandates: 2, owed: 90 },
      },
    });
    renderPage("/admin/orchard/overview");

    expect(await screen.findByText(/5 mandates running out while money is still owed/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Running out/ })).toHaveTextContent("5");
  });

  it("shows no warning when none are at risk", async () => {
    renderPage("/admin/orchard/overview");
    await screen.findByText("Active Mandates");
    expect(screen.queryByText(/running out while money is still owed/)).not.toBeInTheDocument();
  });
});
