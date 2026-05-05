import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserDashboard } from "../User";

// Mock the WebSocket hook so it doesn't cause issues during testing
vi.mock("@/hooks/useWebSocketListener", () => ({
  useWebSocketListener: vi.fn(() => ({
    latestLoanEvent: null,
    nodeEndorsedEvent: null,
  })),
}));

describe("UserDashboard", () => {
  it("renders correctly and displays eligibility status", () => {
    const mockApplicant = {
      msisdn: "233500000000",
      currentTier: 1,
      summary: {
        totalLoansRepaid: 0,
      },
    };
    
    const onActionMock = vi.fn();

    render(
      <UserDashboard
        applicant={mockApplicant}
        tierLimit={300}
        onAction={onActionMock}
      />
    );

    // It should render the eligible state
    expect(screen.getByText(/Get instant access to funds/i)).toBeInTheDocument();
    expect(screen.getByText(/Up to GHS/i)).toBeInTheDocument();
    
    // Check if the Apply button is present
    const applyButtons = screen.getAllByRole("button", { name: /Apply Now/i });
    const applyButton = applyButtons[0];
    expect(applyButton).toBeInTheDocument();

    // Click the apply button
    fireEvent.click(applyButton);

    // Should call onAction with "apply"
    expect(onActionMock).toHaveBeenCalledWith("apply");
  });

  it("displays active loan status correctly", () => {
    const mockApplicant = {
      msisdn: "233500000000",
      currentTier: 1,
      activeLoan: {
        status: "ACTIVE",
        outstandingBalance: 150,
      },
    };
    
    const mockActiveLoanDetails = {
      status: "ACTIVE",
      outstandingBalance: 150,
      repaymentProgress: { percentage: 50 },
    };

    const onActionMock = vi.fn();

    render(
      <UserDashboard
        applicant={mockApplicant}
        activeLoanDetails={mockActiveLoanDetails}
        tierLimit={300}
        onAction={onActionMock}
      />
    );

    // The Repay action is triggered by clicking the circular progress indicator which is a div
    const repayDiv = screen.getByText(/50%/i).closest("div");
    expect(repayDiv).toBeInTheDocument();

    fireEvent.click(repayDiv!);
    expect(onActionMock).toHaveBeenCalledWith("repay");
  });
});
