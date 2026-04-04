import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const config = {
  runtime: "nodejs",
};

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  segment: string;
  scheduled_for: string;
  sent: boolean;
  created_by: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests (cron jobs use GET)
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  console.log("[cron/send-scheduled-push] Cron job started at", new Date().toISOString());

  try {
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[cron/send-scheduled-push] Missing Supabase environment variables");
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration - Supabase not configured",
      });
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
      console.error("[cron/send-scheduled-push] Missing VAPID environment variables");
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration - VAPID keys not configured",
      });
    }

    // Configure web-push
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log("[cron/send-scheduled-push] VAPID configured");

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

    // Find pending scheduled notifications (sent = false and scheduled_for <= now)
    const now = new Date().toISOString();
    console.log("[cron/send-scheduled-push] Finding pending notifications where scheduled_for <=", now);

    const { data: pendingNotifications, error: pendingError } = await supabase
      .from("scheduled_push_notifications")
      .select("*")
      .eq("sent", false)
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true });

    if (pendingError) {
      console.error("[cron/send-scheduled-push] Failed to fetch pending notifications:", pendingError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch pending notifications",
        error: pendingError.message,
      });
    }

    const notificationsCount = pendingNotifications?.length || 0;
    console.log(`[cron/send-scheduled-push] Found ${notificationsCount} pending notifications`);

    if (notificationsCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending notifications to send",
        notifications_processed: 0,
        subscriptions_targeted: 0,
        successful_sends: 0,
        failed_sends: 0,
      });
    }

    let totalSubscriptionsTargeted = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    // Process each scheduled notification
    for (const notification of pendingNotifications as ScheduledNotification[]) {
      console.log(`[cron/send-scheduled-push] Processing notification ${notification.id}:`, {
        title: notification.title,
        segment: notification.segment,
        scheduled_for: notification.scheduled_for,
      });

      // Resolve target subscriptions based on segment
      let targetUserIds: string[] = [];

      switch (notification.segment) {
        case "all":
          console.log("[cron/send-scheduled-push] Segment: all - targeting all users with subscriptions");
          // All subscriptions - no user filter needed
          break;

        case "inactive_users":
          console.log("[cron/send-scheduled-push] Segment: inactive_users - finding users inactive for 3+ days");
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

          const { data: inactiveUsers, error: inactiveError } = await supabase
            .from("user_stats")
            .select("user_id")
            .lt("last_sign_in_at", threeDaysAgo.toISOString());

          if (inactiveError) {
            console.error("[cron/send-scheduled-push] Failed to fetch inactive users:", inactiveError);
          } else {
            targetUserIds = inactiveUsers?.map((u) => u.user_id) || [];
          }
          console.log(`[cron/send-scheduled-push] Found ${targetUserIds.length} inactive users`);
          break;

        case "low_ticket_users":
          console.log("[cron/send-scheduled-push] Segment: low_ticket_users - finding users with <5 tickets");
          const { data: lowTicketUsers, error: lowTicketError } = await supabase
            .from("user_stats")
            .select("user_id")
            .lt("weekly_tickets", 5);

          if (lowTicketError) {
            console.error("[cron/send-scheduled-push] Failed to fetch low ticket users:", lowTicketError);
          } else {
            targetUserIds = lowTicketUsers?.map((u) => u.user_id) || [];
          }
          console.log(`[cron/send-scheduled-push] Found ${targetUserIds.length} low ticket users`);
          break;

        case "indonesia_users":
          console.log("[cron/send-scheduled-push] Segment: indonesia_users - finding users with country_code = ID");
          const { data: indonesiaUsers, error: indonesiaError } = await supabase
            .from("profiles")
            .select("id")
            .eq("country_code", "ID");

          if (indonesiaError) {
            console.error("[cron/send-scheduled-push] Failed to fetch Indonesia users:", indonesiaError);
          } else {
            targetUserIds = indonesiaUsers?.map((u) => u.id) || [];
          }
          console.log(`[cron/send-scheduled-push] Found ${targetUserIds.length} Indonesia users`);
          break;

        case "survey_users":
          console.log("[cron/send-scheduled-push] Segment: survey_users - finding users with survey rewards");
          const { data: surveyUsers, error: surveyError } = await supabase
            .from("survey_rewards")
            .select("user_id")
            .eq("status", "completed");

          if (surveyError) {
            console.error("[cron/send-scheduled-push] Failed to fetch survey users:", surveyError);
          } else {
            // Get unique user IDs
            const uniqueUserIds = new Set(surveyUsers?.map((u) => u.user_id) || []);
            targetUserIds = Array.from(uniqueUserIds);
          }
          console.log(`[cron/send-scheduled-push] Found ${targetUserIds.length} survey users`);
          break;

        default:
          console.warn(`[cron/send-scheduled-push] Unknown segment: ${notification.segment}, defaulting to all`);
      }

      // Fetch target subscriptions
      let subscriptionsQuery = supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, user_id");

      if (targetUserIds.length > 0) {
        subscriptionsQuery = subscriptionsQuery.in("user_id", targetUserIds);
      }

      const { data: subscriptions, error: subsError } = await subscriptionsQuery;

      if (subsError) {
        console.error(`[cron/send-scheduled-push] Failed to fetch subscriptions for notification ${notification.id}:`, subsError);
        continue;
      }

      const subscriptionCount = subscriptions?.length || 0;
      totalSubscriptionsTargeted += subscriptionCount;
      console.log(`[cron/send-scheduled-push] Targeting ${subscriptionCount} subscriptions for notification ${notification.id}`);

      if (subscriptionCount === 0) {
        console.log(`[cron/send-scheduled-push] No subscriptions to send for notification ${notification.id}, marking as sent`);
        // Mark as sent even if no subscriptions (nothing to send)
        const { error: updateError } = await supabase
          .from("scheduled_push_notifications")
          .update({
            sent: true,
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        if (updateError) {
          console.error(`[cron/send-scheduled-push] Failed to update notification ${notification.id}:`, updateError);
        }
        continue;
      }

      // Prepare notification payload
      const notificationPayload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `scheduled-${notification.id}-${Date.now()}`,
        timestamp: Date.now(),
        renotify: true,
        requireInteraction: true,
        data: {
          url: "/"
        }
      });

      // Send notifications to all subscriptions
      const results = await Promise.allSettled(
        (subscriptions as PushSubscription[]).map(async (sub, index) => {
          try {
            console.log(`[cron/send-scheduled-push] Sending notification ${notification.id} to subscription ${index + 1}/${subscriptionCount}:`, {
              id: sub.id,
              user_id: sub.user_id,
              endpoint: sub.endpoint.substring(0, 50) + "...",
            });
            console.log("[cron/send-scheduled-push] Sending payload:", notificationPayload);

            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              notificationPayload
            );

            console.log(`[cron/send-scheduled-push] Successfully sent to subscription ${sub.id}`);
            return { success: true, id: sub.id };
          } catch (error: any) {
            console.error(`[cron/send-scheduled-push] Failed to send to subscription ${sub.id}:`, {
              statusCode: error.statusCode,
              message: error.message,
            });

            // If endpoint is expired or invalid, delete it
            if (error.statusCode === 404 || error.statusCode === 410) {
              console.log(`[cron/send-scheduled-push] Deleting expired subscription ${sub.id} (status ${error.statusCode})`);
              const { error: deleteError } = await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);

              if (deleteError) {
                console.error(`[cron/send-scheduled-push] Failed to delete expired subscription ${sub.id}:`, deleteError);
              } else {
                console.log(`[cron/send-scheduled-push] Deleted expired subscription ${sub.id}`);
              }
            }

            return { success: false, id: sub.id, error: error.message, statusCode: error.statusCode };
          }
        })
      );

      // Calculate results for this notification
      const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)).length;

      totalSuccessful += successful;
      totalFailed += failed;

      console.log(`[cron/send-scheduled-push] Notification ${notification.id} send results:`, {
        total: subscriptionCount,
        successful,
        failed,
      });

      // Mark notification as sent
      const { error: updateError } = await supabase
        .from("scheduled_push_notifications")
        .update({
          sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      if (updateError) {
        console.error(`[cron/send-scheduled-push] Failed to mark notification ${notification.id} as sent:`, updateError);
      } else {
        console.log(`[cron/send-scheduled-push] Notification ${notification.id} marked as sent`);
      }
    }

    console.log("[cron/send-scheduled-push] Cron job completed:", {
      notifications_processed: notificationsCount,
      subscriptions_targeted: totalSubscriptionsTargeted,
      successful_sends: totalSuccessful,
      failed_sends: totalFailed,
    });

    return res.status(200).json({
      success: true,
      message: "Scheduled notifications processed successfully",
      notifications_processed: notificationsCount,
      subscriptions_targeted: totalSubscriptionsTargeted,
      successful_sends: totalSuccessful,
      failed_sends: totalFailed,
    });
  } catch (error) {
    console.error("[cron/send-scheduled-push] Cron job error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process scheduled notifications",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
