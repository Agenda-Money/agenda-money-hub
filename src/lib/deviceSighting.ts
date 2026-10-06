// Tells the backend which device a signed-in customer is using.
//
// WHY A SEPARATE CALL
//   This is deliberately not attached to any application request. A custom
//   header on those would need adding to the server's CORS allow-list, and a
//   browser refuses every request that carries a header the server does not
//   allow, so a mistake there would take the customer site down. A separate,
//   fire-and-forget call cannot affect an application whatever happens to it.
//
// WHAT THE ID IS
//   A random value this browser makes once and keeps. It identifies the browser,
//   not the person or the handset, and clearing site data starts a new one.
//
// WHETHER ANYTHING IS STORED
//   That is the server's decision, behind a switch that is off until the privacy
//   notice is approved. The server always answers the same way, so this module
//   cannot tell and does not try to.

const DEVICE_ID_KEY = "agenda_device_id";
const REPORTED_KEY = "agenda_device_reported";

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** The ID this browser keeps for itself, made on first use. Null if storage is blocked. */
export function getDeviceId(): string | null {
  try {
    const existing = globalThis.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const fresh = randomId();
    globalThis.localStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
  } catch {
    // Private mode or blocked storage: report nothing rather than a throwaway ID
    // that would make every visit look like a new device.
    return null;
  }
}

/**
 * Reports this device once per browser session. Never throws and never waits:
 * a failure here must not be visible to the customer or slow anything down.
 */
export function reportDevice(baseUrl: string, token: string | null | undefined): void {
  if (!token || !baseUrl) return;
  try {
    if (globalThis.sessionStorage.getItem(REPORTED_KEY) === token.slice(-16)) return;

    const deviceId = getDeviceId();
    if (!deviceId) return;

    globalThis.sessionStorage.setItem(REPORTED_KEY, token.slice(-16));

    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }

    void fetch(`${baseUrl}/api/users/device-sighting`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        deviceId,
        timezone,
        screen: `${globalThis.screen?.width ?? 0}x${globalThis.screen?.height ?? 0}`,
        platform: globalThis.navigator?.platform,
      }),
      keepalive: true,
    }).catch(() => {
      // Deliberately silent.
    });
  } catch {
    // Deliberately silent.
  }
}
