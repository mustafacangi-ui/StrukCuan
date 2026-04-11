import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { VALID_SEGMENTS } from "./../_lib/resolveSegment.js";

export const config = { runtime: "nodejs" };

interface SchedulePushBody {
  title: string;
  body: string;
  segment: string;
  scheduled_for: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    console.log("[schedule-push] auth header", req.headers.authorization ? "present" : "missing");
    console.log("[schedule-push] service role exists", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "schedule-push failed",
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

    console.log("[schedule-push] admin user", user?.id);

    const { title, body, segment, scheduled_for } = (req.body || {}) as SchedulePushBody;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Title must be ≤100 characters" });
    }
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "Body is required" });
    }
    if (body.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Body must be ≤500 characters" });
    }
    if (!segment || !VALID_SEGMENTS.includes(segment as any)) {
      return res.status(400).json({
        success: false,
        message: `Invalid segment. Valid: ${VALID_SEGMENTS.join(", ")}`,
      });
    }
    if (!scheduled_for) {
      return res.status(400).json({ success: false, message: "scheduled_for is required" });
    }
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format (use ISO 8601)" });
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ success: false, message: "Scheduled date must be in the future" });
    }

    const { data, error: insertError } = await supabase
      .from("scheduled_push_notifications")
      .insert({
        title: title.trim(),
        body: body.trim(),
        segment,
        scheduled_for,
        sent: false,
        created_by: user.id,
      })
      .select("*")
      .maybeSingle();

    if (insertError) {
      console.error("[schedule-push] scheduled_push_notifications insert:", JSON.stringify(insertError));
      return res.status(500).json({
        error: "schedule-push failed",
        details: `scheduled_push_notifications insert failed: ${insertError.message}. code=${(insertError as any).code ?? "n/a"} hint=${(insertError as any).hint ?? "n/a"}`,
      });
    }

    if (!data) {
      return res.status(500).json({
        error: "schedule-push failed",
        details:
          "scheduled_push_notifications insert returned no row (check RLS with service role, policies, or table schema).",
      });
    }

    return res.status(200).json({ success: true, message: "Scheduled successfully", scheduled_notification: data });
  } catch (error) {
    console.error("[schedule-push] uncaught:", error);
    if (res.headersSent) return;
    return res.status(500).json({
      error: "schedule-push failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
