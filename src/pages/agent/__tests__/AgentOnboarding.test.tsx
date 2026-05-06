import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AgentOnboarding from "../AgentOnboarding";
import { BrowserRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AgentOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { agentCode: "A001" },
    });
  });

  it("renders the Alternate Phone Number field in Step 1", () => {
    render(
      <BrowserRouter>
        <AgentOnboarding />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Alternate Phone Number \*/i)).toBeInTheDocument();
  });

  it("allows entering an alternate phone number", () => {
    render(
      <BrowserRouter>
        <AgentOnboarding />
      </BrowserRouter>
    );

    const altPhoneInput = screen.getByLabelText(/Alternate Phone Number \*/i);
    fireEvent.change(altPhoneInput, { target: { value: "0244123456" } });
    expect(altPhoneInput).toHaveValue("0244123456");
  });

  it("validates the alternate phone number if provided", async () => {
    render(
      <BrowserRouter>
        <AgentOnboarding />
      </BrowserRouter>
    );

    const altPhoneInput = screen.getByLabelText(/Alternate Phone Number \*/i);
    fireEvent.change(altPhoneInput, { target: { value: "123" } });
    
    // It should show validation error for invalid Ghanaian number
    expect(screen.getByText(/Must be a valid Ghanaian number/i)).toBeInTheDocument();
  });
});
