import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDeviceId, reportDevice } from "../deviceSighting";

const BASE = "https://api.example.test";
const TOKEN = "header.payload.signaturesignature1234";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock = vi.fn().mockResolvedValue({ status: 204 });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getDeviceId", () => {
  it("makes an ID once and keeps it", () => {
    const first = getDeviceId();
    expect(first).toBeTruthy();
    expect(getDeviceId()).toBe(first);
  });

  it("makes an ID the server will accept (16 to 64 of letters, digits, dash, underscore)", () => {
    expect(getDeviceId()).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
  });

  it("returns null rather than a throwaway ID when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getDeviceId()).toBeNull();
  });
});

describe("reportDevice", () => {
  it("posts the device to the dedicated endpoint with the customer's token", () => {
    reportDevice(BASE, TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/users/device-sighting`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(init.body).deviceId).toBe(getDeviceId());
  });

  it("never sends the customer's number; the server takes it from the session", () => {
    reportDevice(BASE, TOKEN);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("msisdn");
  });

  it("reports once per session, not on every render", () => {
    reportDevice(BASE, TOKEN);
    reportDevice(BASE, TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports again for a different sign-in", () => {
    reportDevice(BASE, TOKEN);
    reportDevice(BASE, "other.token.differentsignature9999");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing when nobody is signed in", () => {
    reportDevice(BASE, null);
    reportDevice(BASE, undefined);
    reportDevice(BASE, "");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when storage is blocked, rather than inventing a device", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    reportDevice(BASE, TOKEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws or rejects when the request fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(() => reportDevice(BASE, TOKEN)).not.toThrow();
    await Promise.resolve();
  });

  it("never throws when fetch itself throws", () => {
    fetchMock.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => reportDevice(BASE, TOKEN)).not.toThrow();
  });
});
