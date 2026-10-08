import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessPanel } from "../AccessPanel";
import { listAccountingAdmins, setAccountingRole } from "@/api/accounting.api";

vi.mock("@/api/accounting.api", () => ({
  listAccountingAdmins: vi.fn(),
  setAccountingRole: vi.fn(),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

const list = listAccountingAdmins as unknown as ReturnType<typeof vi.fn>;
const setRole = setAccountingRole as unknown as ReturnType<typeof vi.fn>;

const admins = [
  { _id: "a1", fullName: "Ama Uploader", email: "ama@x.test", role: "admin", accountingRole: "uploader" },
  { _id: "a2", fullName: "Kofi Plain", email: "kofi@x.test", role: "admin" },
  { _id: "a3", fullName: "Charles Boss", email: "charles@x.test", role: "superadmin" },
];

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AccessPanel />
    </QueryClientProvider>,
  );
}

// Radix's Select uses browser methods jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue(admins);
  setRole.mockResolvedValue({});
});

describe("the explanation", () => {
  it("says what each role can do, including that an uploader can never approve", async () => {
    renderPanel();

    expect(await screen.findByText(/Enters expenses and can ask for one to be deleted. Can never approve./i)).toBeInTheDocument();
    expect(screen.getByText(/Approves or rejects expenses other people entered/i)).toBeInTheDocument();
    expect(screen.getByText("Read-only.")).toBeInTheDocument();
  });

  it("says what an admin with no role keeps", async () => {
    renderPanel();
    expect(await screen.findByText(/Keeps the access they had before roles/i)).toBeInTheDocument();
  });
});

describe("the admin list", () => {
  it("shows each admin with their account type", async () => {
    renderPanel();

    const row = await screen.findByTestId("admin-a1");
    expect(within(row).getByText("Ama Uploader")).toBeInTheDocument();
    expect(within(row).getByText("ama@x.test")).toBeInTheDocument();
    expect(within(row).getByText("admin")).toBeInTheDocument();
    expect(within(screen.getByTestId("admin-a3")).getByText("superadmin")).toBeInTheDocument();
  });

  it("shows the current role, and 'Not assigned' for an admin with none", async () => {
    renderPanel();

    const assigned = await screen.findByTestId("admin-a1");
    expect(within(assigned).getByRole("combobox")).toHaveTextContent("Uploader");
    expect(within(screen.getByTestId("admin-a2")).getByRole("combobox")).toHaveTextContent("Not assigned");
  });

  it("says so when there are no admins", async () => {
    list.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText("No admins found.")).toBeInTheDocument();
  });

  it("shows the server's message if it refuses, as it does for anyone but a superadmin", async () => {
    list.mockRejectedValue({ response: { data: { message: "Your accounting role does not allow this action" } } });
    renderPanel();

    // getFriendlyErrorMessage maps the error; what matters is an error is shown
    // and nothing is listed.
    await waitFor(() => expect(screen.queryByTestId("admin-a1")).not.toBeInTheDocument());
    await waitFor(() => expect(document.querySelector(".text-destructive")).not.toBeNull());
  });
});

describe("changing a role", () => {
  async function pick(adminId: string, option: RegExp) {
    const row = await screen.findByTestId(adminId);
    fireEvent.click(within(row).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: option }));
  }

  it("sets the role the admin was given", async () => {
    renderPanel();

    await pick("admin-a2", /^Approver$/);

    await waitFor(() => expect(setRole).toHaveBeenCalledWith("a2", "approver"));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Kofi Plain is now approver" })));
  });

  it("clears a role by sending null", async () => {
    renderPanel();

    await pick("admin-a1", /Not assigned/);

    await waitFor(() => expect(setRole).toHaveBeenCalledWith("a1", null));
  });

  it("refreshes the list after a change", async () => {
    renderPanel();

    await pick("admin-a2", /^Viewer$/);

    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(1));
  });

  it("tells the user when the change is refused", async () => {
    setRole.mockRejectedValue({ response: { data: { message: "nope" } } });
    renderPanel();

    await pick("admin-a2", /^Uploader$/);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive", title: "Could not change the role" })),
    );
  });
});
