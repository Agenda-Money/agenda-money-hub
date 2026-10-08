import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "../AnalyticsPage";
import { usePortfolio } from "@/components/analytics/portfolio";

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const ok = (data: unknown) => ({ data, error: false, loading: false, refetch: vi.fn() });
vi.mock("@/components/analytics/analytics.hooks", () => ({
  useSummary: () =>
    ok({
      // The old figure: total principal ever lent, repaid loans included.
      loanBook: { total: 999999 },
      overdueLoans: { count: 77 },
      disbursements: { today: { totalGHS: 0 }, thisWeek: { totalGHS: 0 }, allTime: { totalGHS: 0 } },
      userActivity: {},
    }),
  usePerformance: () => ok({ defaultRate: { overall: 12.3 }, repaymentRate: { overall: 80 }, portfolioAtRisk: { PAR15: { overall: 9 } } }),
  useDistribution: () => ok({}),
  useVolume: () => ok({}),
  useCsaPerformance: () => ok({}),
  useReferralAnalytics: () => ok({}),
}));

vi.mock("@/components/analytics/portfolio", () => ({ usePortfolio: vi.fn() }));

vi.mock("@/components/analytics/AnalyticsWidgets", () => ({
  SectionHead: ({ title }: { title: string }) => <h2>{title}</h2>,
  SectionError: ({ section }: { section: string }) => <div>{section} failed</div>,
  TierBreakdownTables: () => null,
  ChartSignupGrowth: () => null,
  ChartTierDistribution: () => null,
  GeographicList: () => null,
  ChartDisbColl: () => null,
  RepaymentChannels: () => null,
  PanelHead: () => null,
  CsaPerformanceTable: () => null,
}));
vi.mock("@/components/analytics/ReferralAnalytics", () => ({ ReferralAnalytics: () => null }));
vi.mock("@/components/analytics/CashflowProjection", () => ({ CashflowProjectionPanel: () => null }));

const portfolioHook = usePortfolio as unknown as ReturnType<typeof vi.fn>;

const snapshot = {
  asOf: "2026-10-08T12:00:00.000Z",
  definitions: {
    defaultAfterDays: 300,
    systemDefaultAfterDays: 30,
    loanBook: "Money still owed on disbursed loans.",
    pastDue: "Days past due is counted from each loan's due date.",
    defaultRate: "Share of the loan book, by value, on loans 300 or more days past due.",
    systemDefault: "The loans our system marks DEFAULTED, which it does 30 days after the due date.",
  },
  allTimeDisbursement: { loans: 400, valueDisbursed: 90000, principal: 100000 },
  loanBook: { loans: 100, outstanding: 10000 },
  bands: [
    { key: "current", label: "Not yet due", loans: 60, outstanding: 6000, shareOfBookPct: 60, isDefault: false },
    { key: "1-30", label: "1 to 30 days past due", loans: 40, outstanding: 4000, shareOfBookPct: 40, isDefault: false },
    { key: "300+", label: "300+ days past due (default)", loans: 0, outstanding: 0, shareOfBookPct: 0, isDefault: true },
  ],
  pastDue: { loans: 40, outstanding: 4000, shareOfBookPct: 40 },
  defaultRate: { afterDays: 300, loans: 0, outstanding: 0, shareOfBookPct: 0 },
  systemDefaulted: { afterDays: 30, loans: 30, outstanding: 3000, shareOfBookPct: 30 },
};


beforeEach(() => {
  vi.clearAllMocks();
  portfolioHook.mockReturnValue({ data: snapshot, isLoading: false, error: null });
});

describe("loan book", () => {
  it("shows what is still owed, not the old total-ever-lent figure", () => {
    render(<AnalyticsPage />);

    // The same figure also appears as the table total; the card is the one with the label.
    expect(screen.getAllByText("GHS 10,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Still owed across 100 loans")).toBeInTheDocument();
    expect(screen.queryByText("GHS 999,999")).not.toBeInTheDocument();
  });
});

describe("past due", () => {
  it("replaces the old overdue count with a past-due total that says how much is owed", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("Past due")).toBeInTheDocument();
    expect(screen.getByText(/GHS 4,000 owed, 40\.0% of the book/)).toBeInTheDocument();
    expect(screen.queryByText("Overdue loans")).not.toBeInTheDocument();
  });

  it("lists every band, so the late part of the book is visible", () => {
    render(<AnalyticsPage />);

    const bands = screen.getByTestId("portfolio-bands");
    expect(within(bands).getByText("1 to 30 days past due")).toBeInTheDocument();
    expect(within(bands).getByTestId("band-total")).toHaveTextContent("GHS 10,000");
  });
});

describe("default rate", () => {
  it("uses the 300-day definition and says so in the label", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("Default rate (300+ days)")).toBeInTheDocument();
    expect(screen.queryByText("DD+15 unpaid")).not.toBeInTheDocument();
  });

  it("carries the system's own DEFAULTED figure on the same card", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText(/System marks defaulted at 30 days: 30\.0% \(30 loans\)/)).toBeInTheDocument();
  });

  it("explains the definition and the system's rule under the table", () => {
    render(<AnalyticsPage />);

    const defs = screen.getByTestId("portfolio-definitions");
    expect(defs).toHaveTextContent("300 or more days past due");
    expect(defs).toHaveTextContent("30 days after the due date");
  });
});

describe("when the portfolio cannot be loaded", () => {
  it("says so on each card instead of falling back to the old figures", () => {
    portfolioHook.mockReturnValue({ data: undefined, isLoading: false, error: new Error("down") });
    render(<AnalyticsPage />);

    expect(screen.getAllByText("Unavailable").length).toBe(3);
    expect(screen.getAllByText("Could not load the portfolio figures").length).toBe(3);
    expect(screen.queryByText("GHS 999,999")).not.toBeInTheDocument();
    expect(screen.queryByText("12.3%")).not.toBeInTheDocument();
    expect(screen.queryByTestId("portfolio-bands")).not.toBeInTheDocument();
  });
});
