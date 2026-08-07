/**
 * src/lib/domain.ts
 * Utility to extract and identify the current active subdomain.
 */

export type Subdomain = "admin" | "agent" | "apply" | "collections" | "report";

export type CollectionsProvider = "PAYSTACK" | "ORCHARD";

function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.")
  );
}

export function getSubdomain(): Subdomain {
  const hostname = window.location.hostname;

  // Handle local development environments
  if (isLocalDevHost(hostname)) {
    // Determine based on port (e.g., 8081 = admin, 8082 = agent)
    const port = window.location.port;
    if (port === "8085") return "report";
    if (port === "8084") return "collections";
    if (port === "8083") return "apply";
    if (port === "8082") return "agent";
    if (port === "8081") return "admin";

    // Fallback to environment variable or admin default
    const localDevSubdomain = import.meta.env.VITE_LOCAL_SUBDOMAIN as
      | Subdomain
      | undefined;
    return localDevSubdomain || "admin";
  }

  // Handle Production/Staging subdomains (e.g., admin.agendamoney.com)
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (
      sub === "admin" ||
      sub === "agent" ||
      sub === "apply" ||
      sub === "collections" ||
      sub === "report"
    ) {
      return sub as Subdomain;
    }
  }

  // Fallback default for unknown prod structures (e.g. naked domain)
  // If the app is deployed to a naked domain (no subdomain) but the path indicates
  // which portal the user is trying to reach (for example `/agent/...`), prefer
  // that path-based indicator so client-side routing works after redirects.
  const pathname = window.location.pathname || "/";
  if (pathname.startsWith("/collections") || pathname.startsWith("/csa"))
    return "collections";
  if (pathname.startsWith("/report")) return "report";
  if (pathname.startsWith("/apply")) return "apply";
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/admin")) return "admin";

  return "admin";
}

/**
 * TEMPORARY: apply.agendamoney.com is pointed at sandbox while appsNmobile's
 * QA team tests the Orchard integration there (integration only exists on
 * sandbox, not yet promoted to production). Every other subdomain keeps
 * using the normal build-time VITE_API_URL. Remove this override once
 * Orchard testing wraps up and/or the integration ships to production.
 */
const APPLY_SANDBOX_OVERRIDE_URL = "https://sandbox.agendamoney.com";

export function getApiBaseUrl(): string {
  const buildTimeUrl = (import.meta.env.VITE_API_URL as string | undefined) || "";
  const hostname = window.location.hostname;
  const isLocalDev = isLocalDevHost(hostname);

  if (!isLocalDev && getSubdomain() === "apply") {
    return APPLY_SANDBOX_OVERRIDE_URL;
  }

  return buildTimeUrl;
}

export function getCollectionsProvider(): CollectionsProvider {
  const hostname = window.location.hostname;

  // Keep local development aligned with the current Paystack flow unless the
  // backend is explicitly switched to a sandbox environment.
  if (isLocalDevHost(hostname)) {
    return "PAYSTACK";
  }

  return getSubdomain() === "apply" ? "ORCHARD" : "PAYSTACK";
}
