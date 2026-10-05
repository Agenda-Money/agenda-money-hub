import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicantFraudChecks } from "../ApplicantFraudChecks";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;

function renderIt(props: { msisdn?: string; enabled: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicantFraudChecks {...props} />
    </QueryClientProvider>,
  );
}

const answer = (findings: unknown[]) =>
  get.mockResolvedValue({ data: { success: true, data: { findings } } });

beforeEach(() => vi.clearAllMocks());

describe("with findings", () => {
  it("lists each one in plain English", async () => {
    answer([
      { rule: "REFERENCE_SHARED", severity: "medium", message: "3 other applicants named 233549999999 as their reference." },
      { rule: "REFERRER_IN_DEFAULT", severity: "low", message: "Referred by Efua Asante, who is in default." },
    ]);
    renderIt({ msisdn: "233541000001", enabled: true });

    expect(await screen.findByText("Reference used by several applicants")).toBeTruthy();
    expect(screen.getByText(/3 other applicants named/)).toBeTruthy();
    expect(screen.getByText("Referred by a customer in default")).toBeTruthy();
    expect(screen.queryByText("REFERENCE_SHARED")).toBeNull();
  });

  it("frames them as prompts to call, not a verdict", async () => {
    answer([{ rule: "REFERENCE_SHARED", severity: "low", message: "1 other applicant named it." }]);
    renderIt({ msisdn: "233541000001", enabled: true });

    expect(await screen.findByText(/prompts to call, not a verdict/)).toBeTruthy();
  });

  it("asks for exactly this applicant", async () => {
    answer([{ rule: "REFERENCE_SHARED", severity: "low", message: "x" }]);
    renderIt({ msisdn: "233541000001", enabled: true });
    await screen.findByTestId("applicant-fraud-checks");

    expect(get).toHaveBeenCalledWith("/api/admin/fraud/applicants/233541000001/checks");
  });
});

describe("with nothing to report", () => {
  it("renders nothing, and in particular no reassurance", async () => {
    answer([]);
    const { container } = renderIt({ msisdn: "233541000001", enabled: true });

    await waitFor(() => expect(get).toHaveBeenCalled());
    // An empty result is not evidence the applicant is fine, so no tick, no
    // "no concerns", no "all clear".
    expect(container.textContent).toBe("");
    expect(screen.queryByText(/no concerns|all clear|passed|clean/i)).toBeNull();
  });
});

describe("when it cannot be loaded", () => {
  it("shows nothing rather than getting in the way of the review", async () => {
    // A viewer gets a 403 here, because the endpoint is admin-only.
    get.mockRejectedValue({ response: { status: 403, data: { message: "Forbidden" } } });
    const { container } = renderIt({ msisdn: "233541000001", enabled: true });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});

describe("when not to ask", () => {
  it("does not request anything while the modal is closed", () => {
    renderIt({ msisdn: "233541000001", enabled: false });
    expect(get).not.toHaveBeenCalled();
  });

  it("does not request anything without a number", () => {
    renderIt({ msisdn: undefined, enabled: true });
    expect(get).not.toHaveBeenCalled();
  });
});
