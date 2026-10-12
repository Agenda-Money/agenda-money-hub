import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingApprovals } from "../PendingApprovals";
import { getAdminPendingApprovals } from "@/lib/api";

vi.mock("@/lib/api", () => ({ getAdminPendingApprovals: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

// The sheet is covered by its own tests. Here it only has to receive the loan.
const opened = vi.fn();
vi.mock("@/components/loans/LoanReviewModal", () => ({
  LoanReviewModal: ({ loan }: { loan: unknown }) => {
    opened(loan);
    return null;
  },
}));

const get = getAdminPendingApprovals as unknown as ReturnType<typeof vi.fn>;

const row = (over: Record<string, unknown> = {}) => ({
  id: "l1",
  user: "Ama Owusu",
  phone: "233541000001",
  amount: 100,
  tier: 1,
  tenor: 10,
  status: "PENDING",
  ...over,
});

const firstApproval = { adminId: "admin-ama", adminName: "Ama Approver", at: "2026-10-12T09:00:00.000Z" };

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PendingApprovals />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("pending approvals on the dashboard", () => {
  it("says who approved first and that a second admin is needed", async () => {
    get.mockResolvedValue({ data: [row({ firstApproval })] });
    renderIt();

    expect(await screen.findByTestId("first-approval-l1")).toHaveTextContent("First approved by Ama Approver");
    expect(screen.getByTestId("first-approval-l1")).toHaveTextContent("Waiting for a second admin");
  });

  it("says nothing extra for a loan nobody has approved", async () => {
    get.mockResolvedValue({ data: [row()] });
    renderIt();

    await screen.findByText("Ama Owusu");
    expect(screen.queryByTestId("first-approval-l1")).not.toBeInTheDocument();
  });

  it("hands the first approval to the review sheet, which uses it to stop the same admin approving twice", async () => {
    get.mockResolvedValue({ data: [row({ firstApproval })] });
    renderIt();

    fireEvent.click(await screen.findByText("Ama Owusu"));

    expect(opened).toHaveBeenCalledWith(
      expect.objectContaining({ firstApproval: expect.objectContaining({ adminId: "admin-ama" }) }),
    );
  });
});
