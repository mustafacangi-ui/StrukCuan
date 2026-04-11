import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { VALID_SEGMENTS, fetchSubscriptionsForSegment } from "../_lib/resolveSegment";
import { deletePushDeviceById } from "../_lib/pushDevices";

export const config = { runtime: "nodejs" };

interface SendPushBody {
  title: string;
  body: string;
  /** Optional audience filter — defaults to "all" */
  segment?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { title, body, segment = "all" } = req.body as SendPushBody;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "Body is required" });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Title must be ≤100 characters" });
    }
    if (body.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Body must be ≤500 characters" });
    }
    if (!VALID_SEGMENTS.includes(segment as any)) {
      return res.status(400).json({ success: false, message: `Invalid segment. Valid: ${VALID_SEGMENTS.join(", ")}` });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, message: "Supabase not configured" });
    }
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
      return res.status(500).json({ success: false, message: "VAPID keys not configured" });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (!user.app_metadata?.is_admin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    // Save to push_notifications log
    const { data: notifRecord, error: insertError } = await supabase
      .from("push_notifications")
      .insert({ title: trimmedTitle, body: trimmedBody, created_by: user.id, sent_at: new Date().toISOString() })
      .select("id")
      .single();

    if (insertError) {
      console.error("[send-push] Failed to save notification log:", JSON.stringify(insertError));
      return res.status(500).json({
        success: false,
        message: "Failed to save notification",
        error: insertError.message,
        details: {
          code: (insertError as any).code,
          hint: (insertError as any).hint,
          details: (insertError as any).details,
        },
      });
    }

    // Resolve device rows for requested segment (never throws from resolver)
    let subscriptions: Awaited<ReturnType<typeof fetchSubscriptionsForSegment>>["subscriptions"];
    let resolvedUserCount: number | null;
    let pushDevicesTable: string | null;
    try {
      const resolved = await fetchSubscriptionsForSegment(supabase, segment);
      subscriptions = resolved.subscriptions;
      resolvedUserCount = resolved.resolvedUserCount;
      pushDevicesTable = resolved.pushDevicesTable;
    } catch (err: any) {
      console.error("[send-push] fetchSubscriptionsForSegment threw:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to resolve push audience",
        details: err?.message ?? String(err),
      });
    }

    console.log(
      "[send-push] segment:",
      segment,
      "resolvedUserCount:",
      resolvedUserCount === null ? "ALL" : resolvedUserCount,
      "pushTable:",
      pushDevicesTable ?? "(none)",
      "deviceRows:",
      subscriptions.length
    );

    if (!pushDevicesTable) {
      return res.status(500).json({
        success: false,
        error: "Failed to resolve push audience",
        details:
          "No push device table available. Create push_subscriptions or push_tokens, or set PUSH_DEVICES_TABLE.",
      });
    }

    const subscriptionCount = subscriptions.length;

    const payload = JSON.stringify({
      title: trimmedTitle,
      body: trimmedBody,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: `manual-${Date.now()}`,
      timestamp: Date.now(),
      renotify: true,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          return { success: true, id: sub.id };
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await deletePushDeviceById(supabase, sub.id);
          }
          return { success: false, id: sub.id, error: err.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;
    const failed = subscriptionCount - successful;

    console.log(`[send-push] Done — sent: ${successful}, failed: ${failed}`);

    return res.status(200).json({
      success: true,
      message: "Notification sent",
      notification_id: notifRecord.id,
      total: subscriptionCount,
      successful,
      failed,
      segment,
    });
  } catch (error) {
    console.error("[send-push] Unexpected error:", error);
    return res.status(500).json({ success: false, message: "Internal error", error: error instanceof Error ? error.message : "Unknown" });
  }
}
