/**
 * Production app URL. The app runs ONLY on this domain.
 * OAuth redirects, invite links, and shared URLs always use this.
 */
export const APP_URL = "https://www.strukcuan.com";

/** Hostnames that must redirect to APP_URL (auth runs only on production) */
export const REDIRECT_HOSTS = ["struk-cuan.vercel.app", "strukcuan.com"];

/**
 * OAuth redirect URL. On localhost: ALWAYS return current origin (port included).
 * NEVER redirect to production on localhost - enables local testing.
 * Returns e.g. http://localhost:8080 or http://localhost:5173
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      return window.location.origin; // includes port: http://localhost:8080
    }
  }
  return APP_URL;
}

/** Localhost dev mode: never redirect to production, use anonymous auth for camera (testing only) */
export const IS_LOCALHOST =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
