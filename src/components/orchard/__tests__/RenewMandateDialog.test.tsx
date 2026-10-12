import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RenewMandateDialog, type RenewTarget } from "../RenewMandateDialog";
import * as orchard from "@/api/orchard.api";
import { toast } from "sonner";

vi.mock("@/api/orchard.api", () => ({
  renewOrchardMandate: vi.fn(),
  confirmOrchardOtp: vi.fn(),
  resendOrchardOtp: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fn = (f: unknown) => f as ReturnType<typeof vi.fn>;
const renew = fn(orchard.renewOrchardMandate);
const confirm = fn(orchard.confirmOrchardOtp);
const resend = fn(orchard.resendOrchardOtp);

const target: RenewTarget = { msisdn: "233541000001", customerName: "Ama Test", loanReference: "AM-1", owed: 120 };
const onClose = vi.fn();

function renderDialog(t: RenewTarget | null = target) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RenewMandateDialog target={t} onClose={onClose} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  renew.mockResolvedValue({ message: "sent", data: {} });
  confirm.mockResolvedValue({ data: { response: { resp_code: "000" } } });
  resend.mockResolvedValue({});
});

describe("starting a renewal", () => {
  it("says what it will do before doing anything", () => {
    renderDialog();
    expect(screen.getByText("Renew auto-repay")).toBeInTheDocument();
    expect(screen.getByText(/Ama Test · loan AM-1 · still owes ₵120.00/)).toBeInTheDocument();
    expect(screen.getByText(/ends as soon as you start/)).toBeInTheDocument();
    expect(renew).not.toHaveBeenCalled();
  });

  it("sends the code for this customer only when asked, then asks for it", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Send the customer a code" }));

    await waitFor(() => expect(renew).toHaveBeenCalledWith("233541000001"));
    expect(await screen.findByText("Enter the code")).toBeInTheDocument();
  });

  it("stays on the first step and says why when the renewal is refused", async () => {
    renew.mockRejectedValue({ response: { data: { message: "This mandate still has 20 days left." } } });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Send the customer a code" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This mandate still has 20 days left."));
    expect(screen.getByText("Renew auto-repay")).toBeInTheDocument();
  });
});

describe("entering the code", () => {
  async function toCodeStep() {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Send the customer a code" }));
    await screen.findByText("Enter the code");
  }

  it("warns not to take the code by text or from a number the admin did not call", async () => {
    await toCodeStep();
    expect(screen.getByText(/call you place yourself/)).toBeInTheDocument();
  });

  it("will not confirm until there is a code, and keeps only digits", async () => {
    await toCodeStep();
    const confirmBtn = screen.getByRole("button", { name: "Confirm the code" });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Code from the customer"), { target: { value: "12a3-4 56" } });
    expect(screen.getByLabelText("Code from the customer")).toHaveValue("123456");
    expect(confirmBtn).toBeEnabled();
  });

  it("confirms the code and says collection is back on", async () => {
    await toCodeStep();
    fireEvent.change(screen.getByLabelText("Code from the customer"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm the code" }));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith("233541000001", "123456"));
    expect(await screen.findByText("Renewed")).toBeInTheDocument();
  });

  it("does not say renewed when Orchard does not accept the code", async () => {
    confirm.mockResolvedValue({ data: { response: { resp_code: "158", resp_desc: "Incorrect or expired OTP" } } });
    await toCodeStep();
    fireEvent.change(screen.getByLabelText("Code from the customer"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm the code" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Incorrect or expired OTP"));
    expect(screen.queryByText("Renewed")).not.toBeInTheDocument();
    expect(screen.getByText("Enter the code")).toBeInTheDocument();
  });

  it("can send the code again", async () => {
    await toCodeStep();
    fireEvent.click(screen.getByRole("button", { name: "Send it again" }));
    await waitFor(() => expect(resend).toHaveBeenCalledWith("233541000001"));
  });
});

it("renders nothing when there is no one to renew", () => {
  renderDialog(null);
  expect(screen.queryByText("Renew auto-repay")).not.toBeInTheDocument();
});
