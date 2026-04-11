import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET" && req.method !== "DELETE") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    console.log("[push-queue] auth header", req.headers.authorization ? "present" : "missing");
    console.log("[push-queue] service role exists", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "push-queue failed",
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

    console.log("[push-queue] admin user", user.id);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("scheduled_push_notifications")
        .select("*")
        .eq("sent", false)
        .order("scheduled_for", { ascending: true });

      if (error) {
        console.error("[push-queue] GET error:", JSON.stringify(error));
        return res.status(500).json({
          error: "push-queue failed",
          details: error.message,
        });
      }
      return res.status(200).json({ success: true, queue: data ?? [] });
    }

    const raw = req.query.id;
    const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!id?.trim()) {
      return res.status(400).json({ success: false, message: "Query parameter id is required" });
    }

    const { error } = await supabase.from("scheduled_push_notifications").delete().eq("id", id.trim());

    if (error) {
      console.error("[push-queue] DELETE error:", JSON.stringify(error));
      return res.status(500).json({
        error: "push-queue failed",
        details: error.message,
      });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[push-queue] uncaught:", error);
    if (res.headersSent) return;
    return res.status(500).json({
      error: "push-queue failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
