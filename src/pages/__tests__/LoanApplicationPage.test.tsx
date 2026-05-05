import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoanApplicationPage } from "../LoanApplicationPage";
import { TIER_LIMITS } from "../../lib/constants";

describe("LoanApplicationPage", () => {
  it("renders without crashing with default props", () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();

    render(
      <LoanApplicationPage
        tierMin={50}
        tierMax={300}
        currentTier={1}
        tenureOptions={[1, 5, 10, 14]}
        onBack={onBack}
        onContinue={onContinue}
      />
    );

    expect(screen.getByRole("heading", { name: /Loan Application/i })).toBeInTheDocument();
    expect(screen.getByText(/You are eligible for loan up to GHS/i)).toBeInTheDocument();
  });

  it("handles edge cases where tenureOptions might be unexpectedly empty or different", () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();

    // Testing the state where it caused a crash
    render(
      <LoanApplicationPage
        tierMin={50}
        tierMax={300}
        currentTier={1}
        tenureOptions={[]}
        onBack={onBack}
        onContinue={onContinue}
      />
    );

    expect(screen.getByRole("heading", { name: /Loan Application/i })).toBeInTheDocument();
  });
});
