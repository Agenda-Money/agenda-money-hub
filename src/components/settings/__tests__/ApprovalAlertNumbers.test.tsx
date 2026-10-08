import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApprovalAlertNumbers } from "../ApprovalAlertNumbers";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;

const admins = (...rows: Array<Partial<{ adminId: string; fullName: string; email: string; phone: string }>>) => ({
  data: {
    data: rows.map((r, i) => ({
      adminId: `a${i + 1}`,
      fullName: `Admin ${i + 1}`,
      email: `admin${i + 1}@x.test`,
      phone: "",
      ...r,
    })),
  },
});

function renderIt(canWrite = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ApprovalAlertNumbers canWrite={canWrite} />
    </QueryClientProvider>,
  );
}

const box = (name: string) => screen.findByLabelText(`Alert number for ${name}`) as Promise<HTMLInputElement>;
const saveIn = (adminId: string) => within(screen.getByTestId(`alert-row-${adminId}`)).getByRole("button", { name: /save/i });

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(admins({ fullName: "Ama", phone: "233541562819" }, { fullName: "Kofi", phone: "233249911264" }));
  put.mockResolvedValue({ data: {} });
});

describe("listing", () => {
  it("shows each admin with the number saved for them", async () => {
    renderIt();

    expect((await box("Ama")).value).toBe("+233541562819");
    expect((await box("Kofi")).value).toBe("+233249911264");
  });

  it("explains who is texted and who is left out", async () => {
    renderIt();

    await box("Ama");
    expect(screen.getByText(/never texted/i)).toBeInTheDocument();
    expect(screen.getByText(/An admin with no number is not texted/i)).toBeInTheDocument();
  });

  it("shows an empty box for an admin with no number", async () => {
    get.mockResolvedValue(admins({ fullName: "Ama", phone: "233541562819" }, { fullName: "Kofi" }));
    renderIt();

    expect((await box("Kofi")).value).toBe("");
  });

  it("warns when fewer than two admins have a number, because a first approval would then text nobody useful", async () => {
    get.mockResolvedValue(admins({ fullName: "Ama", phone: "233541562819" }, { fullName: "Kofi" }));
    renderIt();

    expect(await screen.findByTestId("alert-numbers-warning")).toBeInTheDocument();
  });

  it("does not warn when two admins have numbers", async () => {
    renderIt();

    await box("Ama");
    expect(screen.queryByTestId("alert-numbers-warning")).not.toBeInTheDocument();
  });

  it("says so if the admins cannot be loaded", async () => {
    get.mockRejectedValue(new Error("down"));
    renderIt();

    expect(await screen.findByText("Could not load the admins.")).toBeInTheDocument();
  });
});

describe("saving", () => {
  it("is disabled until the number is changed", async () => {
    renderIt();

    await box("Ama");
    expect(saveIn("a1")).toBeDisabled();
  });

  it("is not fooled by a different spelling of the same number", async () => {
    renderIt();

    fireEvent.change(await box("Ama"), { target: { value: "0541562819" } });

    expect(saveIn("a1")).toBeDisabled();
  });

  it("sends the new number for that admin", async () => {
    renderIt();

    fireEvent.change(await box("Kofi"), { target: { value: "0541562819" } });
    fireEvent.click(saveIn("a2"));

    await waitFor(() => expect(put).toHaveBeenCalledWith("/api/admin/settings/approval-alerts/a2", { phone: "0541562819" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Kofi will be texted")));
  });

  it("clears a number by saving an empty box", async () => {
    renderIt();

    fireEvent.change(await box("Ama"), { target: { value: "" } });
    fireEvent.click(saveIn("a1"));

    await waitFor(() => expect(put).toHaveBeenCalledWith("/api/admin/settings/approval-alerts/a1", { phone: "" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("will not be texted")));
  });

  it("shows the server's reason when it refuses a number", async () => {
    put.mockRejectedValue({ response: { data: { message: "Invalid Ghana phone number format" } } });
    renderIt();

    fireEvent.change(await box("Ama"), { target: { value: "12345" } });
    fireEvent.click(saveIn("a1"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid Ghana phone number format"));
  });
});

describe("who may change them", () => {
  it("is read-only without write access", async () => {
    renderIt(false);

    expect(await box("Ama")).toBeDisabled();
    expect(saveIn("a1")).toBeDisabled();
  });
});
