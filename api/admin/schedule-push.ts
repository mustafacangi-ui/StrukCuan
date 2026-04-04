import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
};

// Valid segment values
const VALID_SEGMENTS = [
  "all",
  "inactive_users",
  "low_ticket_users",
  "indonesia_users",
  "survey_users",
];

interface SchedulePushBody {
  title: string;
  body: string;
  segment: string;
  scheduled_for: string;
}

interface ScheduledPushNotification {
  id: string;
  title: string;
  body: string;
  segment: string;
  scheduled_for: string;
  sent: boolean;
  created_by: string;
  created_at: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { title, body, segment, scheduled_for } = req.body as SchedulePushBody;

    // Validate title
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      console.error("[schedule-push] Validation error: Title is required");
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (title.trim().length > 100) {
      console.error("[schedule-push] Validation error: Title exceeds 100 characters");
      return res.status(400).json({
        success: false,
        message: "Title must be 100 characters or less",
      });
    }

    // Validate body
    if (!body || typeof body !== "string" || body.trim().length === 0) {
      console.error("[schedule-push] Validation error: Body is required");
      return res.status(400).json({
        success: false,
        message: "Body is required",
      });
    }

    if (body.trim().length > 500) {
      console.error("[schedule-push] Validation error: Body exceeds 500 characters");
      return res.status(400).json({
        success: false,
        message: "Body must be 500 characters or less",
      });
    }

    // Validate segment
    if (!segment || typeof segment !== "string" || segment.trim().length === 0) {
      console.error("[schedule-push] Validation error: Segment is required");
      return res.status(400).json({
        success: false,
        message: "Segment is required",
      });
    }

    if (!VALID_SEGMENTS.includes(segment)) {
      console.error("[schedule-push] Validation error: Invalid segment", { segment, valid: VALID_SEGMENTS });
      return res.status(400).json({
        success: false,
        message: `Invalid segment. Must be one of: ${VALID_SEGMENTS.join(", ")}`,
        valid_segments: VALID_SEGMENTS,
      });
    }

    // Validate scheduled_for
    if (!scheduled_for || typeof scheduled_for !== "string" || scheduled_for.trim().length === 0) {
      console.error("[schedule-push] Validation error: Scheduled_for is required");
      return res.status(400).json({
        success: false,
        message: "Scheduled_for is required",
      });
    }

    // Validate ISO 8601 date format
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      console.error("[schedule-push] Validation error: Invalid scheduled_for date format", { scheduled_for });
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled_for date format. Use ISO 8601 format (e.g., 2026-04-05T18:00:00Z)",
      });
    }

    // Check if scheduled date is in the future
    if (scheduledDate <= new Date()) {
      console.error("[schedule-push] Validation error: Scheduled date must be in the future", { scheduled_for, now: new Date().toISOString() });
      return res.status(400).json({
        success: false,
        message: "Scheduled date must be in the future",
      });
    }

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration - Supabase not configured",
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header to identify the admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - no authorization header",
      });
    }

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    console.log("[schedule-push] Auth user:", { userId: user?.id, email: user?.email, hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      console.error("[schedule-push] Auth failed:", authError);
      return res.status(401).json({
        success: false,
        message: "Unauthorized - invalid token",
        error: authError?.message || "Authentication failed",
        details: authError,
      });
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.is_admin === true;
    console.log("[schedule-push] Admin check:", { isAdmin, appMetadata: user.app_metadata });

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - admin access required",
        error: "User is not an admin",
        details: { userId: user.id, isAdmin },
      });
    }

    // Insert scheduled notification
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    const { data: scheduledNotification, error: insertError } = await supabase
      .from("scheduled_push_notifications")
      .insert({
        title: trimmedTitle,
        body: trimmedBody,
        segment: segment,
        scheduled_for: scheduled_for,
        sent: false,
        created_by: user.id,
      })
      .select("*")
      .single();

    console.log("[schedule-push] Insert result:", {
      scheduledNotification,
      insertError: insertError?.message,
      code: insertError?.code,
    });

    if (insertError) {
      console.error("[schedule-push] Failed to save scheduled push notification:", insertError);
      return res.status(500).json({
        success: false,
        message: "Failed to save scheduled notification",
        error: insertError?.message || "Unknown error",
        details: insertError,
      });
    }

    console.log("[schedule-push] Scheduled notification created successfully:", {
      id: scheduledNotification.id,
      title: trimmedTitle,
      segment,
      scheduled_for,
    });

    return res.status(200).json({
      success: true,
      message: "Scheduled notification created successfully",
      scheduled_notification: scheduledNotification as ScheduledPushNotification,
    });
  } catch (error) {
    console.error("[schedule-push] Schedule push notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule notification",
      error: error instanceof Error ? error.message : "Unknown error",
      details: error,
    });
  }
}
