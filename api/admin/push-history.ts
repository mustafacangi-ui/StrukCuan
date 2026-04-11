import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    console.log("[push-history] auth header", req.headers.authorization ? "present" : "missing");
    console.log("[push-history] service role exists", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "push-history failed",
        details: "Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (!user.app_metadata?.is_admin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    console.log("[push-history] admin user", user.id);

    const { data, error } = await supabase
      .from("scheduled_push_notifications")
      .select("*")
      .eq("sent", true)
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[push-history] GET error:", JSON.stringify(error));
      return res.status(500).json({
        error: "push-history failed",
        details: error.message,
      });
    }

    return res.status(200).json({ success: true, history: data ?? [] });
  } catch (error) {
    console.error("[push-history] uncaught:", error);
    if (res.headersSent) return;
    return res.status(500).json({
      error: "push-history failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
