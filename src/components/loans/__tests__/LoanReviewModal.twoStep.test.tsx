import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { LoanReviewModal } from "../LoanReviewModal";
import { approveLoan } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: {} }) },
  getAdminUserProfile: vi.fn().mockResolvedValue({}),
  approveLoan: vi.fn(),
  rejectLoan: vi.fn(),
  syncLoanTransfer: vi.fn(),
  resolveMomoName: vi.fn().mockResolvedValue({ resolvedName: "Ama Owusu", registeredName: "Ama Owusu", match: true, score: 1 }),
}));
vi.mock("@/api/orchard.api", () => ({ getOrchardTransactionStatus: vi.fn() }));
vi.mock("@/components/fraud/ApplicantFraudChecks", () => ({ ApplicantFraudChecks: () => null }));
vi.mock("@/components/collections/CampaignSettlementPanel", () => ({ CampaignSettlementPanel: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

let currentAdmin = { id: "admin-kofi" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ canWrite: true, user: currentAdmin }),
}));

const approve = approveLoan as unknown as ReturnType<typeof vi.fn>;

const baseLoan = {
  id: "loan-1",
  loanReference: "L1",
  status: "PENDING",
  principal: 100,
  userMsisdn: "233541000001",
  user: { fullName: "Ama Owusu" },
};

function renderModal(loan: Record<string, unknown> = baseLoan, onActionSuccess = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoanReviewModal loan={loan as never} isOpen onOpenChange={vi.fn()} onActionSuccess={onActionSuccess} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onActionSuccess };
}

const approveButton = () => screen.findByRole("button", { name: /approve loan|give final approval|approve anyway/i });

beforeEach(() => {
  vi.clearAllMocks();
  currentAdmin = { id: "admin-kofi" };
});

describe("the first approval toast", () => {
  it("shows the server's message, which says whether the other admin was texted", async () => {
    approve.mockResolvedValue({
      success: true,
      stage: "FIRST_APPROVAL_RECORDED",
      alerted: 1,
      message: "First approval recorded. The other admin has been texted to give the final approval.",
    });
    renderModal();

    fireEvent.click(await approveButton());

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("First approval recorded", {
        description: "First approval recorded. The other admin has been texted to give the final approval.",
      }),
    );
  });

  it("shows the warning when nobody could be texted, so the approver knows to tell the other admin", async () => {
    approve.mockResolvedValue({
      success: true,
      stage: "FIRST_APPROVAL_RECORDED",
      alerted: 0,
      message: "First approval recorded. No admin has an alert number saved, so tell the other admin yourself.",
    });
    renderModal();

    fireEvent.click(await approveButton());

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "First approval recorded",
        expect.objectContaining({ description: expect.stringContaining("tell the other admin yourself") }),
      ),
    );
  });
});

describe("before any approval", () => {
  it("offers a plain Approve Loan and no banner", async () => {
    renderModal();

    expect(await approveButton()).toHaveTextContent("Approve Loan");
    expect(screen.queryByTestId("first-approval-banner")).not.toBeInTheDocument();
  });

  it("does not claim the loan is approved when only the first approval was recorded", async () => {
    approve.mockResolvedValue({ success: true, stage: "FIRST_APPROVAL_RECORDED", message: "First approval recorded." });
    const { onActionSuccess } = renderModal();

    fireEvent.click(await approveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("First approval recorded", expect.anything()));
    expect(toast.success).not.toHaveBeenCalledWith("Loan approved successfully", expect.anything());
    expect(onActionSuccess).not.toHaveBeenCalled();
  });

  it("still says approved when one approval is enough (flag off)", async () => {
    approve.mockResolvedValue({ success: true, stage: "DISBURSING", message: "Disbursement started" });
    const { onActionSuccess } = renderModal();

    fireEvent.click(await approveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Loan approved successfully", expect.anything()));
    expect(onActionSuccess).toHaveBeenCalledWith("approve", "loan-1");
  });

  it("treats a reply with no stage as the old single approval", async () => {
    approve.mockResolvedValue({ success: true, message: "ok" });
    const { onActionSuccess } = renderModal();

    fireEvent.click(await approveButton());

    await waitFor(() => expect(onActionSuccess).toHaveBeenCalledWith("approve", "loan-1"));
  });
});

describe("after the first approval", () => {
  const firstBy = (adminId: string, adminName: string) => ({
    ...baseLoan,
    firstApproval: { adminId, adminName, at: "2026-10-07T09:00:00.000Z" },
  });

  it("tells a different admin who approved first and that theirs sends the money", async () => {
    renderModal(firstBy("admin-ama", "Ama"));

    expect(await screen.findByTestId("first-approval-banner")).toHaveTextContent("First approved by Ama");
    expect(screen.getByTestId("first-approval-banner")).toHaveTextContent("will send the money");
  });

  it("labels the button as the final approval", async () => {
    renderModal(firstBy("admin-ama", "Ama"));

    expect(await approveButton()).toHaveTextContent("Give final approval");
    expect(await approveButton()).toBeEnabled();
  });

  it("stops the same admin from trying a second time", async () => {
    currentAdmin = { id: "admin-ama" };
    renderModal(firstBy("admin-ama", "Ama"));

    expect(await screen.findByTestId("first-approval-banner")).toHaveTextContent("You gave the first approval");
    expect(await approveButton()).toBeDisabled();
  });

  it("reports the final approval as approved and refreshes the list", async () => {
    approve.mockResolvedValue({ success: true, stage: "DISBURSING", message: "Disbursement started" });
    const { onActionSuccess } = renderModal(firstBy("admin-ama", "Ama"));

    fireEvent.click(await approveButton());

    await waitFor(() => expect(onActionSuccess).toHaveBeenCalledWith("approve", "loan-1"));
  });

  it("shows the server's reason if it refuses the final approval", async () => {
    approve.mockRejectedValue({ response: { data: { message: "A different admin must give the final approval." } } });
    renderModal(firstBy("admin-ama", "Ama"));

    fireEvent.click(await approveButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("A different admin must give the final approval."));
  });
});
