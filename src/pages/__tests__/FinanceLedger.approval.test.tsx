import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceLedgerPage } from "../FinancePage";
import * as acc from "@/api/accounting.api";

vi.mock("@/api/accounting.api", () => ({
  getAccountingSettings: vi.fn().mockResolvedValue({ costOfFundsRatePercent: 2, lossThresholdDays: 90 }),
  updateAccountingSettings: vi.fn(),
  listLedgerEntries: vi.fn(),
  createLedgerEntry: vi.fn(),
  requestLedgerDeletion: vi.fn(),
  approveLedgerDeletion: vi.fn(),
  rejectLedgerDeletion: vi.fn(),
  approveLedgerEntry: vi.fn(),
  rejectLedgerEntry: vi.fn(),
  getMyAccountingAccess: vi.fn(),
  getPnl: vi.fn(),
  getPnlTrend: vi.fn(),
  getChannelBreakdown: vi.fn(),
  getCashflow: vi.fn(),
}));

let me = { id: "approver-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ canWrite: true, canDelete: false, user: me }),
}));
vi.mock("@/hooks/useSignedUrl", () => ({ useSignedUrl: () => null }));
vi.mock("@/lib/storage", () => ({ uploadToStorage: vi.fn() }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

const m = acc as unknown as Record<string, ReturnType<typeof vi.fn>>;

const entry = (over: Record<string, unknown> = {}) => ({
  _id: "e1",
  category: "insurance",
  costType: "indirect",
  description: "Office cover",
  amount: 500,
  periodMonth: new Date().toISOString().slice(0, 7),
  enteredBy: "uploader-1",
  enteredByName: "Ama Uploader",
  approvalStatus: "pending",
  status: "active",
  createdAt: "2026-10-07T09:00:00.000Z",
  updatedAt: "2026-10-07T09:00:00.000Z",
  ...over,
});

function as(permissions: string[], entries: unknown[]) {
  m.getMyAccountingAccess.mockResolvedValue({ accountingRole: null, permissions });
  m.listLedgerEntries.mockResolvedValue({ data: entries, pagination: { total: entries.length, page: 1, pages: 1 } });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FinanceLedgerPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  me = { id: "approver-1" };
  m.approveLedgerEntry.mockResolvedValue({});
  m.rejectLedgerEntry.mockResolvedValue({});
});

describe("an approver", () => {
  it("sees Approve and Reject on someone else's pending entry", async () => {
    as(["read", "approve"], [entry()]);
    renderPage();

    expect(await screen.findByRole("button", { name: "Approve entry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject entry" })).toBeInTheDocument();
    expect(screen.getByTestId("approval-e1")).toHaveTextContent("Awaiting approval");
    expect(screen.getByTestId("approval-e1")).toHaveTextContent("Entered by Ama Uploader");
  });

  it("does not see them on an entry they entered themselves, and is told why", async () => {
    as(["read", "approve"], [entry({ enteredBy: "approver-1", enteredByName: "Kofi" })]);
    renderPage();

    expect(await screen.findByText("Someone else must approve")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve entry" })).not.toBeInTheDocument();
  });

  it("approves after confirming", async () => {
    as(["read", "approve"], [entry()]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Approve entry" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("will count in the P&L");
    expect(m.approveLedgerEntry).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(m.approveLedgerEntry).toHaveBeenCalledWith("e1"));
  });

  it("cannot reject without a reason", async () => {
    as(["read", "approve"], [entry()]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reject entry" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Reject" });

    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: "No receipt" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(m.rejectLedgerEntry).toHaveBeenCalledWith("e1", "No receipt"));
  });

  it("shows the server's reason if it refuses", async () => {
    as(["read", "approve"], [entry()]);
    m.approveLedgerEntry.mockRejectedValue({ response: { data: { message: "You entered this expense" } } });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Approve entry" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
  });

  it("cannot enter an expense", async () => {
    as(["read", "approve"], [entry()]);
    renderPage();

    await screen.findByTestId("approval-e1");
    expect(screen.queryByRole("button", { name: /new entry/i })).not.toBeInTheDocument();
  });
});

describe("an uploader", () => {
  it("can enter an expense but is never offered Approve or Reject", async () => {
    as(["read", "upload", "requestDeletion"], [entry({ enteredBy: "approver-1" }), entry({ _id: "e2" })]);
    renderPage();

    await screen.findByTestId("approval-e2");
    expect(screen.getByRole("button", { name: /new entry/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve entry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject entry" })).not.toBeInTheDocument();
  });
});

describe("a viewer", () => {
  it("sees entries and can do nothing to them", async () => {
    as(["read"], [entry()]);
    renderPage();

    await screen.findByTestId("approval-e1");
    expect(screen.queryByRole("button", { name: /new entry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve entry" })).not.toBeInTheDocument();
    expect(document.querySelector("button .lucide-trash2")).toBeNull();
  });
});

describe("while access is unknown", () => {
  it("offers nothing, rather than an action that may be refused", async () => {
    m.getMyAccountingAccess.mockRejectedValue(new Error("down"));
    m.listLedgerEntries.mockResolvedValue({ data: [entry()], pagination: { total: 1, page: 1, pages: 1 } });
    renderPage();

    await screen.findByTestId("approval-e1");
    expect(screen.queryByRole("button", { name: "Approve entry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new entry/i })).not.toBeInTheDocument();
  });
});

describe("how entries are labelled", () => {
  it("marks a rejected entry and keeps the reason on hover", async () => {
    as(["read"], [entry({ approvalStatus: "rejected", rejectionReason: "No receipt" })]);
    renderPage();

    const cell = await screen.findByTestId("approval-e1");
    expect(cell).toHaveTextContent("Rejected");
    expect(within(cell).getByText("Rejected").closest("span")).toHaveAttribute("title", "No receipt");
  });

  it("shows an entry from before approvals existed as approved, not pending", async () => {
    as(["read"], [entry({ approvalStatus: undefined })]);
    renderPage();

    const cell = await screen.findByTestId("approval-e1");
    expect(cell).toHaveTextContent("Approved");
    expect(cell).not.toHaveTextContent("Awaiting approval");
  });

  it("names who approved an approved entry", async () => {
    as(["read"], [entry({ approvalStatus: "approved", approvedByName: "Kofi Approver" })]);
    renderPage();

    expect(await screen.findByTestId("approval-e1")).toHaveTextContent("Approved by Kofi Approver");
  });

  it("can be narrowed to what is awaiting approval", async () => {
    as(["read", "approve"], [entry()]);
    renderPage();

    fireEvent.click(await screen.findByLabelText(/awaiting approval only/i));

    await waitFor(() =>
      expect(m.listLedgerEntries).toHaveBeenCalledWith(expect.objectContaining({ approvalStatus: "pending" })),
    );
  });
});
