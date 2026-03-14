import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL or anon key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
  )
}

/**
 * Explicit localStorage for session persistence (browser + PWA).
 * flowType: "pkce" improves OAuth reliability in PWAs.
 * detectSessionInUrl: true lets Supabase read tokens from OAuth redirect URL.
 */
const storage = typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: storage ?? undefined,
    flowType: "pkce",
  },
});
