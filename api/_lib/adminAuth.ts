import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export function createServiceRoleClient(res: VercelResponse): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ success: false, message: "Supabase not configured" });
    return null;
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Validates Bearer JWT and `app_metadata.is_admin`. Sends JSON error and returns null if not allowed. */
export async function requireAdminUser(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient
): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ success: false, message: "Invalid token" });
    return null;
  }
  if (!user.app_metadata?.is_admin) {
    res.status(403).json({ success: false, message: "Admin access required" });
    return null;
  }
  return user;
}
