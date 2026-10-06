import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceNotice, DeviceNoticeView } from "../DeviceNotice";

const SHORT = "We note the device you use to spot fraud.";
const POLICY = "Line one of the policy.\n\nLine two of the policy.";

describe("DeviceNoticeView", () => {
  it("shows the short notice with a Privacy link", () => {
    render(<DeviceNoticeView shortNotice={SHORT} policyText={POLICY} />);

    expect(screen.getByTestId("device-notice")).toHaveTextContent(SHORT);
    expect(screen.getByRole("button", { name: "Privacy" })).toBeInTheDocument();
  });

  it("keeps the full wording behind the link until it is clicked", () => {
    render(<DeviceNoticeView shortNotice={SHORT} policyText={POLICY} />);
    expect(screen.queryByTestId("policy-text")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Privacy" }));

    expect(screen.getByTestId("policy-text")).toHaveTextContent("Line one of the policy.");
    expect(screen.getByTestId("policy-text")).toHaveTextContent("Line two of the policy.");
  });

  it("shows the wording as text, never as HTML, since an admin edits it and the public reads it", () => {
    render(
      <DeviceNoticeView
        shortNotice={'Hello <img src=x onerror="alert(1)"> world'}
        policyText={"<script>alert(1)</script>"}
      />,
    );

    expect(screen.getByTestId("device-notice").querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Privacy" }));
    expect(screen.getByTestId("policy-text").querySelector("script")).toBeNull();
    expect(screen.getByTestId("policy-text")).toHaveTextContent("<script>alert(1)</script>");
  });
});

describe("DeviceNotice", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const respond = (body: unknown, ok = true) =>
    fetchMock.mockResolvedValue({ ok, json: async () => body });

  it("asks the public endpoint, with no credentials", async () => {
    respond({ data: null });
    render(<DeviceNotice baseUrl="https://api.example.test" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/site/privacy-notice");
    expect(init?.headers).not.toHaveProperty("Authorization");
  });

  it("shows the published notice", async () => {
    respond({ data: { shortNotice: SHORT, policyText: POLICY, version: 2 } });
    render(<DeviceNotice baseUrl="https://api.example.test" />);

    expect(await screen.findByTestId("device-notice")).toHaveTextContent(SHORT);
  });

  it("shows nothing when there is no notice, which is whenever capture is off", async () => {
    respond({ data: null });
    const { container } = render(<DeviceNotice baseUrl="https://api.example.test" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing, and no error, when the request fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { container } = render(<DeviceNotice baseUrl="https://api.example.test" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when the server answers with an error", async () => {
    respond({ message: "boom" }, false);
    const { container } = render(<DeviceNotice baseUrl="https://api.example.test" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores a response that is not the shape it expects", async () => {
    respond({ data: { shortNotice: 123, policyText: null } });
    const { container } = render(<DeviceNotice baseUrl="https://api.example.test" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("does nothing without a base URL", () => {
    render(<DeviceNotice baseUrl="" />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
