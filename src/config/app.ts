/**
 * Canonical public URL (no trailing slash).
 * MUST include https:// — if you use "www.strukcuan.com" only, Supabase treats it as a path and opens
 * https://PROJECT.supabase.co/www.strukcuan.com?code=... → {"error":"requested path is invalid"}
 */
function normalizeOrigin(url: string): string {
  let t = url.trim().replace(/\/+$/, "");
  if (!t) return "https://www.strukcuan.com";
  if (!/^https?:\/\//i.test(t)) {
    t = `https://${t.replace(/^\/+/, "")}`;
  }
  return t;
}

const envApp =
  typeof import.meta.env.VITE_APP_URL === "string" ? import.meta.env.VITE_APP_URL : "";

export const APP_URL = normalizeOrigin(envApp || "https://www.strukcuan.com");

/** Hostnames that must redirect to APP_URL before the SPA runs (see main.tsx) */
export const REDIRECT_HOSTS = ["struk-cuan.vercel.app", "strukcuan.com"];

/**
 * Where Supabase sends the user after Google OAuth / magic link (must be listed in Supabase Redirect URLs + match Site URL domain).
 * Localhost: current origin only.
 * Production: always APP_URL (canonical www), never *.vercel.app — even if someone opened the preview URL by mistake.
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      return window.location.origin;
    }
  }
  return APP_URL;
}

/** Localhost dev mode: never redirect to production, use anonymous auth for camera (testing only) */
export const IS_LOCALHOST =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname) &&
  !(window as any).Capacitor;


