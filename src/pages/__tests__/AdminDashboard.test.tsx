import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Dashboard from "../Dashboard";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import * as router from "react-router-dom";

// --- MOCKS ---

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  getAdminRecentLoans: vi.fn(() => Promise.resolve({ data: [] })),
  getAdminPendingApprovals: vi.fn(() => Promise.resolve({ data: [] })),
  getAdminRecentRepayments: vi.fn(() => Promise.resolve({ data: [] })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/SocketContext", () => ({
  useSocketContext: vi.fn(() => ({
    notifications: [],
  })),
}));

vi.mock("@/hooks/useDateFilter", () => ({
  useDateFilter: vi.fn(() => ({
    preset: "last7days",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-08"),
    applyPreset: vi.fn(),
    setStartDate: vi.fn(),
    setEndDate: vi.fn(),
  })),
}));

vi.mock("@/hooks/useSocket", () => ({
  useSocket: vi.fn(),
}));

vi.mock("@/hooks/useSignedUrl", () => ({
  useSignedUrl: vi.fn((path) => (path ? `http://signed-url/${path}` : null)),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: vi.fn(() => ({ pathname: "/" })),
    Navigate: vi.fn(({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />),
  };
});

// Mock child components to simplify dashboard tests
vi.mock("@/components/dashboard/RecentLoansTable", () => ({
  RecentLoansTable: () => <div data-testid="recent-loans-table">Recent Loans</div>,
}));

vi.mock("@/components/dashboard/PendingApprovals", () => ({
  PendingApprovals: () => <div data-testid="pending-approvals">Pending Approvals</div>,
}));

vi.mock("@/components/dashboard/RecentRepaymentsWidget", () => ({
  RecentRepaymentsWidget: () => <div data-testid="recent-repayments-widget">Recent Repayments</div>,
}));

vi.mock("@/components/dashboard/MoMDisbursementCard", () => ({
  MoMDisbursementCard: () => <div data-testid="mom-disbursement-card">MoM Growth</div>,
}));

// --- SETUP ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("Admin Dashboard Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    
    // Default mocks
    (useAuth as any).mockReturnValue({
      user: { role: "admin", fullName: "Admin User" },
      loading: false,
      logout: vi.fn(),
      isViewer: false,
    });

    (router.useLocation as any).mockReturnValue({ pathname: "/" });

    // Default API mocks
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/api/admin/analytics/summary") {
        return Promise.resolve({
          data: {
            data: {
              loanBook: { value: 125000 },
              activeLoans: { count: 84 },
            },
          },
        });
      }
      if (url === "/api/admin/analytics/performance") {
        return Promise.resolve({
          data: {
            data: {
              repaymentRate: { rate: 92.4 },
            },
          },
        });
      }
      if (url.includes("/api/admin/analytics/volume")) {
        return Promise.resolve({
          data: {
            data: {
              momDisbursementGrowth: [],
            },
          },
        });
      }
      if (url.includes("/api/admin/users/pending")) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.reject(new Error(`Unhandled API call: ${url}`));
    });
  });

  describe("Dashboard Content", () => {
    it("renders core stats cards with data from API", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <Dashboard />
          </router.BrowserRouter>
        </QueryClientProvider>
      );

      // Verify Stats Cards
      expect(await screen.findByText(/₵ 125,000/i)).toBeInTheDocument();
      expect(await screen.findByText(/84/i)).toBeInTheDocument();
      expect(await screen.findByText(/92.4%/i)).toBeInTheDocument();

      // Verify Widget Presence
      expect(screen.getByTestId("recent-loans-table")).toBeInTheDocument();
      expect(screen.getByTestId("pending-approvals")).toBeInTheDocument();
      expect(screen.getByTestId("mom-disbursement-card")).toBeInTheDocument();
    });

    it("shows loading skeleton initially", () => {
      // Don't resolve API immediately to see loading state
      (api.get as any).mockReturnValue(new Promise(() => {}));

      render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <Dashboard />
          </router.BrowserRouter>
        </QueryClientProvider>
      );

      // DashboardSkeleton has animate-pulse divs
      const skeleton = screen.getByTestId("dashboard-skeleton");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Layout Responsiveness", () => {
    it("toggles sidebar on mobile view", async () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event("resize"));

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <DashboardLayout>
              <div>Main Content</div>
            </DashboardLayout>
          </router.BrowserRouter>
        </QueryClientProvider>
      );

      const sidebar = container.querySelector("aside");
      expect(sidebar).toHaveClass("-translate-x-full");

      // Find and click the menu toggle in Header
      const menuButton = screen.getByRole("button", { name: /Open sidebar/i });
      
      fireEvent.click(menuButton);
      expect(sidebar).toHaveClass("translate-x-0");
      
      // Close via sidebar's close button (the one inside the aside)
      let currentCloseButtons = screen.getAllByRole("button", { name: /Close sidebar/i });
      let closeButton = currentCloseButtons.find(btn => btn.closest("aside"));
      if (closeButton) fireEvent.click(closeButton);
      expect(sidebar).toHaveClass("-translate-x-full");

      // Test overlay as well
      fireEvent.click(menuButton);
      // Wait for re-render and re-query
      currentCloseButtons = screen.getAllByRole("button", { name: /Close sidebar/i });
      const overlay = currentCloseButtons.find(btn => !btn.closest("aside"));
      if (overlay) fireEvent.click(overlay);
      expect(sidebar).toHaveClass("-translate-x-full");
    });

    it("hides user details in header on mobile", () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event("resize"));

      render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <DashboardLayout>
              <div>Main Content</div>
            </DashboardLayout>
          </router.BrowserRouter>
        </QueryClientProvider>
      );

      const detailsContainer = screen.getByText(/Admin User/i).closest("div");
      expect(detailsContainer).toHaveClass("hidden md:block");
    });
  });

  describe("Permissions", () => {
    it("shows view-only badge for viewer role", () => {
      (useAuth as any).mockReturnValue({
        user: { role: "viewer", fullName: "Viewer User" },
        loading: false,
        logout: vi.fn(),
        isViewer: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <DashboardLayout>
              <div>Main Content</div>
            </DashboardLayout>
          </router.BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText(/View-only admin/i)).toBeInTheDocument();
    });

    it("restricts access for agents to admin routes", () => {
      (useAuth as any).mockReturnValue({
        user: { role: "agent", fullName: "Agent User" },
        loading: false,
        logout: vi.fn(),
        isViewer: false,
      });

      (router.useLocation as any).mockReturnValue({ pathname: "/admin/dashboard" });

      render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <DashboardLayout>
              <div>Main Content</div>
            </DashboardLayout>
          </router.BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/");
    });
  });
});
