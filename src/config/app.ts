/**
 * Production app URL. The app runs ONLY on this domain.
 * OAuth redirects, invite links, and shared URLs always use this.
 */
export const APP_URL = "https://www.strukcuan.com";

/** Hostnames that must redirect to APP_URL (auth runs only on production) */
export const REDIRECT_HOSTS = ["struk-cuan.vercel.app", "strukcuan.com"];
