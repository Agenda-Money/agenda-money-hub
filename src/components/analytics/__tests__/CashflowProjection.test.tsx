import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CashflowProjectionCard } from "../CashflowProjection";

// The hook is mocked rather than the HTTP layer: what is under test here is
// how the component reads the projection, not how it is fetched.
const mockHook = vi.fn();
vi.mock("../analytics.hooks", () => ({
  useCashflowProjection: (days: number) => mockHook(days),
}));

const projection = (over: Record<string, unknown> = {}) => ({
  data: {
    window: { from: "2026-09-25", to: "2026-10-02", days: 7 },
    due: {
      loans: 42,
      borrowers: 38,
      expectedInflow: 55_000,
      byDay: [{ date: "2026-09-26", loans: 10, amount: 12_000 }],
    },
    reapplication: {
      grossOutflow: 90_000,
      outflowAtCurrentTier: 70_000,
      promotedBorrowers: 31,
      observedTakeUpRate: 0.6,
      takeUpSample: 120,
      expectedOutflow: 54_000,
    },
    net: { grossRequirement: 35_000, expectedRequirement: -1_000 },
    ...over,
  },
  loading: false,
  error: false,
});

describe("CashflowProjectionCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leads with the expected requirement, not the gross one", () => {
    mockHook.mockReturnValue(
      projection({ net: { grossRequirement: 35_000, expectedRequirement: 20_000 } }),
    );
    render(<CashflowProjectionCard />);

    // The expected figure is the headline; gross appears as the worst case.
    expect(screen.getByText("GHS 20,000")).toBeInTheDocument();
    expect(screen.getByText(/38 borrowers coming back/i)).toBeInTheDocument();
    expect(screen.getByText(/60% return rate/i)).toBeInTheDocument();
  });

  it("reads a negative requirement as a surplus rather than a funding need", () => {
    mockHook.mockReturnValue(projection());
    render(<CashflowProjectionCard />);

    expect(screen.getByText(/surplus/i)).toBeInTheDocument();
    // Shown unsigned — a "-GHS 1,000 required" would be nonsense.
    expect(screen.getByText("GHS 1,000")).toBeInTheDocument();
  });

  it("falls back to the gross figure when there is no take-up history", () => {
    mockHook.mockReturnValue(
      projection({
        reapplication: {
          grossOutflow: 90_000,
          outflowAtCurrentTier: 70_000,
          promotedBorrowers: 31,
          observedTakeUpRate: null,
          takeUpSample: 4,
          expectedOutflow: null,
        },
        net: { grossRequirement: 35_000, expectedRequirement: null },
      }),
    );
    render(<CashflowProjectionCard />);

    // Twice over, and correctly so: with no rate to scale by, the headline and
    // the worst case are the same number.
    expect(screen.getAllByText("GHS 35,000")).toHaveLength(2);
    expect(screen.queryByText(/return rate/i)).not.toBeInTheDocument();
  });

  it("explains why re-lending costs more than the repayments coming in", () => {
    mockHook.mockReturnValue(projection());
    render(<CashflowProjectionCard />);

    expect(screen.getByText(/31 of these borrowers move up a tier/i)).toBeInTheDocument();
  });

  it("asks for the window it was given", () => {
    mockHook.mockReturnValue(projection());
    render(<CashflowProjectionCard days={14} />);
    expect(mockHook).toHaveBeenCalledWith(14);
  });
});
