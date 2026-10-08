import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoansPage from "../LoansPage";
import { getAdminLoans } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getAdminLoans: vi.fn(),
  exportAdminLoans: vi.fn(),
}));
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The review sheet is covered by its own tests; here it only has to receive the loan.
const modalLoan = vi.fn();
vi.mock("@/components/loans/LoanReviewModal", () => ({
  LoanReviewModal: ({ loan }: { loan: unknown }) => {
    modalLoan(loan);
    return null;
  },
}));

const get = getAdminLoans as unknown as ReturnType<typeof vi.fn>;

const loan = (over: Record<string, unknown> = {}) => ({
  _id: "l1",
  loanReference: "AM-L1",
  status: "PENDING",
  principal: 100,
  tenureDays: 10,
  userMsisdn: "233541000001",
  createdAt: "2026-10-07T09:00:00.000Z",
  user: { fullName: "Ama Owusu", currentTier: 1 },
  ...over,
});

const firstApproval = { adminId: "admin-ama", adminName: "Ama Approver", at: "2026-10-07T10:00:00.000Z" };

const reply = (loans: unknown[]) => ({
  loans,
  pagination: { total: loans.length, page: 1, pages: 1 },
});

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <LoansPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(reply([]));
});

describe("the 2nd approval tab", () => {
  it("is offered alongside the other tabs", async () => {
    renderAt("/loans");
    expect(await screen.findByRole("tab", { name: "2nd approval" })).toBeInTheDocument();
  });

  it("asks only for loans that already have a first approval", async () => {
    renderAt("/loans/second-approval");

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(expect.objectContaining({ awaitingSecondApproval: "true", page: 1 })),
    );
  });

  it("does not ask for it on other tabs", async () => {
    renderAt("/loans/active");

    await waitFor(() => expect(get).toHaveBeenCalled());
    const listCalls = get.mock.calls.map((c) => c[0]).filter((p) => p.page === 1);
    expect(listCalls.length).toBeGreaterThan(0);
    for (const p of listCalls) expect(p).not.toHaveProperty("awaitingSecondApproval");
  });

  it("shows a count for it in the stat strip", async () => {
    get.mockImplementation(async (p: Record<string, unknown>) =>
      p.awaitingSecondApproval === "true"
        ? { loans: [], pagination: { total: 4, page: 1, pages: 1 } }
        : reply([]),
    );
    renderAt("/loans");

    await waitFor(() => expect(screen.getByTestId("stat-2nd approval")).toHaveTextContent("4"));
  });
});

describe("a loan waiting for its second approval", () => {
  beforeEach(() => get.mockResolvedValue(reply([loan({ firstApproval })])));

  it("is labelled so, and says who approved first", async () => {
    renderAt("/loans/second-approval");

    expect((await screen.findAllByText("Awaiting 2nd approval")).length).toBeGreaterThan(0);
    expect(await screen.findByTestId("first-approver-l1")).toHaveTextContent("First approved by Ama Approver");
  });

  it("does not show the plain Pending label", async () => {
    renderAt("/loans/second-approval");

    const row = (await screen.findAllByText("AM-L1"))[0].closest("tr")!;
    expect(within(row).getByText("Awaiting 2nd approval")).toBeInTheDocument();
    expect(within(row).queryByText("Pending")).not.toBeInTheDocument();
  });

  it("hands the first approval to the review sheet, which decides who may finish it", async () => {
    renderAt("/loans/second-approval");

    fireEvent.click((await screen.findAllByText("AM-L1"))[0]);

    await waitFor(() =>
      expect(modalLoan).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PENDING", firstApproval: expect.objectContaining({ adminId: "admin-ama" }) }),
      ),
    );
  });
});

describe("an ordinary pending loan", () => {
  it("keeps the Pending label and shows no approver", async () => {
    get.mockResolvedValue(reply([loan()]));
    renderAt("/loans/pending");

    const row = (await screen.findAllByText("AM-L1"))[0].closest("tr")!;
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByTestId("first-approver-l1")).not.toBeInTheDocument();
    expect(screen.queryByText("Awaiting 2nd approval")).not.toBeInTheDocument();
  });

  it("ignores an empty first approval record", async () => {
    get.mockResolvedValue(reply([loan({ firstApproval: {} })]));
    renderAt("/loans/pending");

    const row = (await screen.findAllByText("AM-L1"))[0].closest("tr")!;
    expect(within(row).getByText("Pending")).toBeInTheDocument();
  });
});

describe("a loan past the approval stage", () => {
  it("is not labelled as waiting, even though it still carries its approvals", async () => {
    get.mockResolvedValue(reply([loan({ status: "ACTIVE", dueDate: "2099-01-01", firstApproval })]));
    renderAt("/loans/active");

    const row = (await screen.findAllByText("AM-L1"))[0].closest("tr")!;
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Awaiting 2nd approval")).not.toBeInTheDocument();
  });
});
