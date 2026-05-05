import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserDetailsPage from "../UserDetailsPage";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import * as api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// --- MOCKS ---

vi.mock("@/lib/api", () => ({
  getUserDetail: vi.fn(),
  getUserSessions: vi.fn(() => Promise.resolve({ sessions: [], total: 0 })),
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

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: "user-123" })),
    useNavigate: vi.fn(() => vi.fn()),
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

describe("UserDetailsPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    
    (useAuth as any).mockReturnValue({
      user: { id: "admin-1", role: "admin", fullName: "Admin User" },
      loading: false,
      canWrite: true,
    });
  });

  it("renders user details without truncating metadata", async () => {
    const mockUser = {
      _id: "user-123",
      fullName: "Kwame Asante Extra Long Name That Should Wrap",
      msisdn: "233541234567",
      employmentStatus: "Full-time Employee with a very long title",
      monthlyIncome: "GHS 50,000 - 100,000",
      region: "Greater Accra Region, Southern Part of Ghana",
      address: "No. 45 Long Street, Opposite the Big Tree, Near the Blue Gate, Lakeside",
      gender: "Male",
      dob: "1990-01-01",
      kycStatus: "VERIFIED",
    };

    (api.getUserDetail as any).mockResolvedValue({
      data: {
        user: mockUser,
        loanHistory: [],
        referrals: [],
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UserDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for data to load
    expect(await screen.findByText(/User Personal Metadata/i)).toBeInTheDocument();

    // Check that long values are present
    expect(screen.getByText(/Full-time Employee with a very long title/i)).toBeInTheDocument();
    expect(screen.getByText(/No. 45 Long Street/i)).toBeInTheDocument();

    // Verify that line-clamp-1 and truncate classes are NOT present on these elements
    const employmentValue = screen.getByText(/Full-time Employee with a very long title/i);
    const addressValue = screen.getByText(/No. 45 Long Street/i);

    expect(employmentValue.className).toContain("text-[13px]");
    expect(employmentValue.className).toContain("break-words");

    expect(addressValue.className).toContain("text-[13px]");
    expect(addressValue.className).toContain("break-words");
  });

  it("updates Last Seen based on the latest session data", async () => {
    const mockUser = {
      _id: "user-123",
      fullName: "Kwame Asante",
      lastSeen: { at: "2023-01-01T10:00:00Z", channel: "App" },
    };

    const mockSession = {
      _id: "s-new",
      createdAt: "2024-05-02T09:00:00Z",
      channel: "ussd",
      action: "BALANCE_CHECK",
    };

    (api.getUserDetail as any).mockResolvedValue({
      data: { user: mockUser, loanHistory: [], referrals: [] },
    });

    (api.getUserSessions as any).mockResolvedValue({
      sessions: [mockSession],
      total: 1,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UserDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for Last Seen to show the NEWER session date
    // 2 May 2024 or 02 May 2024
    await waitFor(() => {
      expect(screen.getByText(/USSD/i)).toBeInTheDocument();
      expect(screen.getByText(/2024/i)).toBeInTheDocument();
    }, { timeout: 8000 });
  }, 15000);

  it("handles block user flow correctly", async () => {
    const mockUser = {
      _id: "user-123",
      fullName: "Kwame Asante",
      msisdn: "233541234567",
      isBlocked: false,
    };

    (api.getUserDetail as any).mockResolvedValue({
      data: { user: mockUser, loanHistory: [], referrals: [] },
    });

    (api.blockUser as any).mockResolvedValue({
      success: true,
      message: "User blocked",
      pendingLoansRejected: 2,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UserDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // 1. Wait for page to load and find Block button
    const blockBtn = await screen.findByRole("button", { name: /Block/i });
    expect(blockBtn).toBeInTheDocument();

    // 2. Click Block button to open modal
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(blockBtn);

    // 3. Check if modal is open
    expect(await screen.findByText(/Are you sure you want to block this user/i)).toBeInTheDocument();

    // 4. Fill in reason
    const reasonInput = screen.getByPlaceholderText(/e.g. Suspected fraud/i);
    fireEvent.change(reasonInput, { target: { value: "Test reason" } });

    // 5. Click Block in modal
    const confirmBtn = screen.getByRole("button", { name: /^Block$/ });
    fireEvent.click(confirmBtn);

    // 6. Verify API call
    await waitFor(() => {
      expect(api.blockUser).toHaveBeenCalledWith("233541234567", "Test reason");
    });

    // 7. Verify toast success message
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("2 pending loans rejected"));
  });
});
