import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { PaidViaBadges } from "../PaidViaBadges";
import { PaidViaSummary } from "../PaidViaSummary";
import type { PaidViaCode, RepaymentRow } from "@/lib/repayment-via";

const via = (
  code: PaidViaCode,
  label: string,
  provider: string | null = null,
  basis: "recorded" | "traced" | "unknown" = "recorded",
) => ({ code, label, provider, basis });

describe("PaidViaBadges", () => {
  it("shows how the payment came in and never the word Organic", () => {
    const { container } = render(
      <PaidViaBadges row={{ collectionSource: "organic", paidVia: via("AUTO_DEBIT", "Auto-debit", "Orchard") }} />,
    );
    expect(screen.getByText("Auto-debit · Orchard")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/organic/i);
  });

  it("marks a label that was worked out from the logs", () => {
    render(<PaidViaBadges row={{ paidVia: via("USSD", "USSD", "Paystack", "traced") }} />);
    expect(screen.getByLabelText("worked out from the payment log")).toBeInTheDocument();
  });

  it("says Not recorded rather than guessing when the server did not say", () => {
    render(<PaidViaBadges row={{}} />);
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
  });

  it("adds the collections agent and campaign as their own tags", () => {
    render(
      <PaidViaBadges
        row={{ collectionSource: "collections", assignedCsaName: "Efua", campaign: { cohort: 3 }, paidVia: via("AGENT", "Agent") }}
      />,
    );
    expect(screen.getByText("Collections · Efua")).toBeInTheDocument();
    expect(screen.getByText("Campaign · cohort 3")).toBeInTheDocument();
  });
});

describe("PaidViaSummary", () => {
  const rows: RepaymentRow[] = [
    { amountPaid: 100, paidVia: via("AUTO_DEBIT", "Auto-debit") },
    { amountPaid: 20, paidVia: via("USSD", "USSD") },
    { amountPaid: 30, paidVia: via("USSD", "USSD") },
  ];

  function Harness() {
    const [active, setActive] = useState<PaidViaCode | "ALL">("ALL");
    return <PaidViaSummary rows={rows} active={active} onChange={setActive} />;
  }

  it("shows a count and an amount per way, and a total", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /^All/ })).toHaveTextContent("3 · ₵150.00");
    expect(screen.getByRole("button", { name: /USSD/ })).toHaveTextContent("2 · ₵50.00");
    expect(screen.getByRole("button", { name: /Auto-debit/ })).toHaveTextContent("1 · ₵100.00");
  });

  it("selects a way, and clears it when pressed again", () => {
    render(<Harness />);
    const ussd = screen.getByRole("button", { name: /USSD/ });
    fireEvent.click(ussd);
    expect(ussd).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(ussd);
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders nothing when there are no payments", () => {
    const { container } = render(<PaidViaSummary rows={[]} active="ALL" onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
