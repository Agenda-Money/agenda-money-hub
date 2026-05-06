import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RepaymentsPage from "../RepaymentsPage";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import * as api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// --- MOCKS ---

vi.mock("@/lib/api", () => ({
  getRecentRepayments: vi.fn(() => Promise.resolve({ data: [] })),
  getEligibleLoans: vi.fn(() => Promise.resolve({ loans: [] })),
  recordManualRepayment: vi.fn(() => Promise.resolve({ message: "Success", data: {} })),
  getCollectionActivities: vi.fn(() => Promise.resolve({ data: [] })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useSocket", () => ({
  useSocket: vi.fn(),
}));

vi.mock("@/contexts/SocketContext", () => ({
  useSocketContext: vi.fn(() => ({
    notifications: [],
  })),
}));

vi.mock("@/hooks/useSignedUrl", () => ({
  useSignedUrl: vi.fn((path) => (path ? `http://signed-url/${path}` : null)),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-router-dom more completely
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
    useLocation: vi.fn(() => ({ pathname: "/admin/repayments", search: "", hash: "", state: null })),
  };
});

// --- SETUP ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("RepaymentsPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    
    (useAuth as any).mockReturnValue({
      user: { id: "admin-1", role: "admin", fullName: "Admin User" },
      loading: false,
    });
  });

  it("renders the repayments page", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RepaymentsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByRole("heading", { name: /Loan Repayments/i })).toBeInTheDocument();
  });

  it("auto-generates a reference without submitting the form", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RepaymentsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const autoGenButton = await screen.findByRole("button", { name: /Auto-generate/i });
    // Use exact match to avoid matching "Loan Reference"
    const referenceInput = screen.getByLabelText(/^Reference$/i, { selector: "input" }) as HTMLInputElement;

    fireEvent.click(autoGenButton);

    // admin-1 -> ADMI
    expect(referenceInput.value).toMatch(/^MAN-\d{8}-ADMI-\d{4}$/i);

    // Should NOT have called the API
    expect(api.recordManualRepayment).not.toHaveBeenCalled();
  });

  it("shows error if required fields are missing on submit", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RepaymentsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const submitButton = await screen.findByRole("button", { name: /Record Payment/i });
    fireEvent.click(submitButton);

    expect(toast.error).toHaveBeenCalled();
  });
});
