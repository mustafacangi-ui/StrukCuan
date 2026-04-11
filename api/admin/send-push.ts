import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

interface SendPushBody {
  title: string;
  body: string;
  /** Optional audience filter — defaults to "all" */
  segment?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("[send-push] handler started");

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    console.log("[send-push] auth header", req.headers.authorization ? "present" : "missing");
    console.log("[send-push] service role exists", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "send-push failed",
        details: "Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
      });
    }

    console.log("[send-push] creating supabase client");
    const { createClient } = await import("@supabase/supabase-js");
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

    console.log("[send-push] admin user", user?.id);

    const { title, body, segment = "all" } = (req.body || {}) as SendPushBody;

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

    const { VALID_SEGMENTS, fetchSubscriptionsForSegment } = await import("../_lib/resolveSegment");
    if (!VALID_SEGMENTS.includes(segment as (typeof VALID_SEGMENTS)[number])) {
      return res.status(400).json({
        success: false,
        message: `Invalid segment. Valid: ${VALID_SEGMENTS.join(", ")}`,
      });
    }

    console.log("[send-push] segment", segment);

    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT;
    if (!pub || !priv || !subj) {
      return res.status(500).json({
        error: "send-push failed",
        details:
          "Web Push VAPID keys missing (set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT). This endpoint uses Web Push subscriptions, not Expo push tokens.",
      });
    }

    console.log("[send-push] importing web-push");
    const webpushMod = await import("web-push");
    const webpush = (webpushMod as { default?: typeof webpushMod }).default ?? (webpushMod as unknown as typeof webpushMod);

    try {
      webpush.setVapidDetails(subj, pub, priv);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({
        error: "send-push failed",
        details: `Invalid VAPID configuration (webpush.setVapidDetails failed): ${msg}`,
      });
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    const { data: notifRecord, error: insertError } = await supabase
      .from("push_notifications")
      .insert({
        title: trimmedTitle,
        body: trimmedBody,
        created_by: user.id,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[send-push] push_notifications insert:", JSON.stringify(insertError));
      return res.status(500).json({
        error: "send-push failed",
        details: `push_notifications insert failed: ${insertError.message}. code=${(insertError as any).code ?? "n/a"} hint=${(insertError as any).hint ?? "n/a"}`,
      });
    }

    if (!notifRecord?.id) {
      return res.status(500).json({
        error: "send-push failed",
        details:
          "push_notifications insert returned no row id (check RLS with service role, or table schema / select policy).",
      });
    }

    console.log("[send-push] resolving segment");
    const resolved = await fetchSubscriptionsForSegment(supabase, segment);
    const { subscriptions, resolvedUserCount, pushDevicesTable } = resolved;

    console.log("[send-push] resolved subscriptions", subscriptions?.length || 0);
    console.log("[send-push] push table", pushDevicesTable ?? "(none)");

    if (!pushDevicesTable) {
      return res.status(500).json({
        error: "send-push failed",
        details:
          "No Web Push device table resolved (expected push_subscriptions or push_tokens). Set PUSH_DEVICES_TABLE if your table name differs.",
      });
    }

    const subscriptionCount = subscriptions.length;

    if (subscriptionCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No Web Push subscriptions matched this segment; nothing was sent.",
        notification_id: notifRecord.id,
        total: 0,
        successful: 0,
        failed: 0,
        segment,
        details:
          resolvedUserCount === null
            ? "Segment targets all users but no device rows were found (no push_subscriptions / push_tokens)."
            : `Segment resolved ${resolvedUserCount} user(s) but none have saved Web Push keys (p256dh/auth). Users must opt in via the browser; Expo tokens are not used here.`,
      });
    }

    console.log("[send-push] sending notifications");
    const { deletePushDeviceById } = await import("../_lib/pushDevices");

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
    console.error("[send-push] uncaught:", error);
    if (res.headersSent) return;
    return res.status(500).json({
      error: "send-push failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
