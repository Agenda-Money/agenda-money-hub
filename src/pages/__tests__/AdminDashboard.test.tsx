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

const portfolio = {
  asOf: "2026-10-08T12:00:00.000Z",
  definitions: {
    defaultAfterDays: 300,
    systemDefaultAfterDays: 30,
    loanBook: "Money still owed on disbursed loans.",
    pastDue: "Days past due is counted from each loan's due date.",
    defaultRate: "Share of the loan book, by value, on loans 300 or more days past due.",
    systemDefault: "The loans our system marks DEFAULTED, which it does 30 days after the due date.",
  },
  allTimeDisbursement: { loans: 400, valueDisbursed: 90000, principal: 100000 },
  loanBook: { loans: 100, outstanding: 10000 },
  bands: [
    { key: "current", label: "Not yet due", loans: 60, outstanding: 6000, shareOfBookPct: 60, isDefault: false },
    { key: "1-30", label: "1 to 30 days past due", loans: 20, outstanding: 2000, shareOfBookPct: 20, isDefault: false },
    { key: "300+", label: "300+ days past due (default)", loans: 0, outstanding: 0, shareOfBookPct: 0, isDefault: true },
  ],
  pastDue: { loans: 40, outstanding: 4000, shareOfBookPct: 40 },
  defaultRate: { afterDays: 300, loans: 0, outstanding: 0, shareOfBookPct: 0 },
  systemDefaulted: { afterDays: 30, loans: 30, outstanding: 3000, shareOfBookPct: 30 },
};

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
      if (url === "/api/admin/analytics/portfolio") {
        return Promise.resolve({ data: { data: portfolio } });
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
    const renderDashboard = () =>
      render(
        <QueryClientProvider client={queryClient}>
          <router.BrowserRouter>
            <Dashboard />
          </router.BrowserRouter>
        </QueryClientProvider>
      );

    it("shows all-time disbursement, the loan book and the default rate", async () => {
      renderDashboard();

      const hero = await screen.findByTestId("portfolio-hero");
      expect(hero).toHaveTextContent("All-time disbursement");
      expect(hero).toHaveTextContent("GHS 90,000");
      expect(hero).toHaveTextContent("400 loans paid out");
      expect(hero).toHaveTextContent("Loan book");
      expect(hero).toHaveTextContent("GHS 10,000");
      expect(hero).toHaveTextContent("Still owed across 100 loans");
      expect(hero).toHaveTextContent("Default rate (300+ days)");

      // Operational widgets are still there.
      expect(screen.getByTestId("recent-loans-table")).toBeInTheDocument();
      expect(screen.getByTestId("pending-approvals")).toBeInTheDocument();
      expect(screen.getByTestId("mom-disbursement-card")).toBeInTheDocument();
    });

    it("no longer shows an active loans count", async () => {
      renderDashboard();

      await screen.findByTestId("portfolio-hero");
      expect(screen.queryByText(/active loans/i)).not.toBeInTheDocument();
    });

    it("never shows the 300-day default rate without the system's own figure beside it", async () => {
      renderDashboard();

      const hero = await screen.findByTestId("portfolio-hero");
      // The portfolio says 0%; the system's own DEFAULTED share is on the same card.
      expect(hero).toHaveTextContent("0.0%");
      expect(hero).toHaveTextContent("System marks defaulted at 30 days: 30.0% (30 loans)");
    });

    it("leaves the days-past-due table to the Analytics page", async () => {
      renderDashboard();

      await screen.findByTestId("portfolio-hero");
      expect(screen.queryByTestId("portfolio-bands")).not.toBeInTheDocument();
      expect(screen.queryByTestId("portfolio-definitions")).not.toBeInTheDocument();
    });

    it("says so, rather than showing old numbers, when the portfolio cannot be loaded", async () => {
      (api.get as any).mockImplementation((url: string) =>
        url === "/api/admin/analytics/portfolio"
          ? Promise.reject(new Error("down"))
          : url.includes("/volume")
            ? Promise.resolve({ data: { data: { momDisbursementGrowth: [] } } })
            : Promise.reject(new Error(`Unhandled API call: ${url}`)),
      );
      renderDashboard();

      expect(await screen.findByText("Could not load the portfolio figures.")).toBeInTheDocument();
      expect(screen.queryByTestId("portfolio-hero")).not.toBeInTheDocument();
    });

    it("does not show the portfolio figures while they are still loading", () => {
      // Don't resolve the API, to see the loading state.
      (api.get as any).mockReturnValue(new Promise(() => {}));

      renderDashboard();

      expect(screen.queryByTestId("portfolio-hero")).not.toBeInTheDocument();
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
