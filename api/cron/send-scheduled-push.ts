import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { fetchSubscriptionsForSegment } from "../_lib/resolveSegment";

export const config = { runtime: "nodejs" };

function getJakartaHour(): number {
  return parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }),
    10
  );
}

/** 0 = Sunday, 1 = Monday … 6 = Saturday in Jakarta */
function getJakartaDayOfWeek(): number {
  const dayName = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  });
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayName);
}

/** YYYY-MM-DD in Jakarta */
function getJakartaDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function scheduleDayMatches(scheduleDays: string, dow: number): boolean {
  switch (scheduleDays) {
    case "daily":   return true;
    case "sunday":  return dow === 0;
    case "weekday": return dow >= 1 && dow <= 5;
    case "weekend": return dow === 0 || dow === 6;
    default: {
      // comma-separated day numbers e.g. "0,6"
      return scheduleDays.split(",").map(Number).includes(dow);
    }
  }
}

async function sendPushToSubscribers(
  supabase: ReturnType<typeof createClient>,
  notification: { id: string; title: string; body: string; segment: string },
  tag: string
): Promise<{ successful: number; failed: number; total: number }> {
  const subscriptions = await fetchSubscriptionsForSegment(supabase, notification.segment);
  if (subscriptions.length === 0) {
    return { successful: 0, failed: 0, total: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    timestamp: Date.now(),
    renotify: true,
    requireInteraction: true,
    data: { url: "/" },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        return { success: true };
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        return { success: false, error: err.message };
      }
    })
  );

  const successful = results.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;
  return { successful, failed: subscriptions.length - successful, total: subscriptions.length };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  console.log("[cron/send-scheduled-push] Started at", new Date().toISOString());

  try {
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

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    // ── 1. Ad-hoc scheduled notifications ────────────────────────────────────
    const now = new Date().toISOString();
    const { data: pending, error: pendingError } = await supabase
      .from("scheduled_push_notifications")
      .select("*")
      .eq("sent", false)
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true });

    if (pendingError) {
      console.error("[cron] Failed to fetch pending notifications:", pendingError);
    } else {
      for (const notif of pending ?? []) {
        console.log(`[cron] Processing ad-hoc notification ${notif.id} (segment: ${notif.segment})`);
        const stats = await sendPushToSubscribers(
          supabase,
          { id: notif.id, title: notif.title, body: notif.body, segment: notif.segment },
          `scheduled-${notif.id}-${Date.now()}`
        );
        totalSuccessful += stats.successful;
        totalFailed += stats.failed;
        totalProcessed++;

        await supabase
          .from("scheduled_push_notifications")
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq("id", notif.id);

        console.log(`[cron] Ad-hoc ${notif.id} → ${stats.successful}/${stats.total} sent`);
      }
    }

    // ── 2. Automated templates ────────────────────────────────────────────────
    const currentHour = getJakartaHour();
    const currentDow  = getJakartaDayOfWeek();
    const todayStr    = getJakartaDate();
    const startOfToday = `${todayStr}T00:00:00+07:00`;

    const { data: templates, error: tplError } = await supabase
      .from("push_notification_templates")
      .select("*")
      .eq("enabled", true);

    if (tplError) {
      console.error("[cron] Failed to fetch templates:", tplError);
    } else {
      for (const tpl of templates ?? []) {
        // Check hour match
        if (tpl.schedule_hour_wib !== currentHour) continue;
        // Check day match
        if (!scheduleDayMatches(tpl.schedule_days, currentDow)) continue;
        // Check not already sent today
        if (tpl.last_sent_at && tpl.last_sent_at >= startOfToday) {
          console.log(`[cron] Template ${tpl.template_key} already sent today, skipping`);
          continue;
        }

        console.log(`[cron] Firing template "${tpl.template_key}" (segment: ${tpl.audience})`);
        const stats = await sendPushToSubscribers(
          supabase,
          { id: tpl.id, title: tpl.title, body: tpl.body, segment: tpl.audience },
          `template-${tpl.template_key}-${Date.now()}`
        );
        totalSuccessful += stats.successful;
        totalFailed += stats.failed;
        totalProcessed++;

        // Update last_sent_at
        await supabase
          .from("push_notification_templates")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", tpl.id);

        console.log(`[cron] Template ${tpl.template_key} → ${stats.successful}/${stats.total} sent`);
      }
    }

    console.log("[cron/send-scheduled-push] Done:", { totalProcessed, totalSuccessful, totalFailed });

    return res.status(200).json({
      success: true,
      message: "Cron completed",
      notifications_processed: totalProcessed,
      successful_sends: totalSuccessful,
      failed_sends: totalFailed,
    });
  } catch (error) {
    console.error("[cron/send-scheduled-push] Fatal error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal error",
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}
