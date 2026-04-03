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

interface PushNotificationBody {
  title: string;
  body: string;
}

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
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
    const { title, body } = req.body as PushNotificationBody;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Body is required",
      });
    }

    // Trim and validate length
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (trimmedTitle.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title must be 100 characters or less",
      });
    }

    if (trimmedBody.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Body must be 500 characters or less",
      });
    }

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration - Supabase not configured",
      });
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
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
    console.log("[send-push] VAPID configured:", { subject: process.env.VAPID_SUBJECT });

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

    console.log("[send-push] Auth user:", { userId: user?.id, email: user?.email, hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      console.error("[send-push] Auth failed:", authError);
      return res.status(401).json({
        success: false,
        message: "Unauthorized - invalid token",
        error: authError?.message || "Authentication failed",
        details: authError,
      });
    }

    // Check if user is admin
    const isAdmin = user.app_metadata?.is_admin === true;
    console.log("[send-push] Admin check:", { isAdmin, appMetadata: user.app_metadata });

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - admin access required",
        error: "User is not an admin",
        details: { userId: user.id, isAdmin },
      });
    }

    // Save notification to database
    const { data: notificationRecord, error: insertError } = await supabase
      .from("push_notifications")
      .insert({
        title: trimmedTitle,
        body: trimmedBody,
        created_by: user.id,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    console.log("[send-push] Insert result:", { notificationRecord, insertError: insertError?.message, code: insertError?.code });

    if (insertError) {
      console.error("[send-push] Failed to save push notification:", insertError);
      return res.status(500).json({
        success: false,
        message: "Failed to save notification",
        error: insertError?.message || "Unknown error",
        details: insertError,
      });
    }

    // Get all push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id");

    console.log("[send-push] Subscriptions query:", { count: subscriptions?.length, subsError: subsError?.message, code: subsError?.code });

    if (subsError) {
      console.error("[send-push] Failed to fetch push subscriptions:", subsError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch subscriptions",
        error: subsError?.message || "Unknown error",
        details: subsError,
      });
    }

    const subscriptionCount = subscriptions?.length || 0;
    console.log(`[send-push] Sending to ${subscriptionCount} subscriptions...`);

    const notificationPayload = JSON.stringify({
      title: trimmedTitle,
      body: trimmedBody,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      (subscriptions as PushSubscription[]).map(async (sub, index) => {
        try {
          console.log(`[send-push] Sending to subscription ${index + 1}/${subscriptionCount}:`, {
            id: sub.id,
            user_id: sub.user_id,
            endpoint: sub.endpoint.substring(0, 50) + "...",
          });

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

          console.log(`[send-push] Successfully sent to subscription ${index + 1}`);
          return { success: true, id: sub.id };
        } catch (error: any) {
          console.error(`[send-push] Failed to send to subscription ${index + 1}:`, {
            id: sub.id,
            statusCode: error.statusCode,
            message: error.message,
          });

          // If endpoint is expired or invalid, delete it
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`[send-push] Deleting expired subscription ${sub.id} (status ${error.statusCode})`);
            const { error: deleteError } = await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);

            if (deleteError) {
              console.error(`[send-push] Failed to delete expired subscription ${sub.id}:`, deleteError);
            } else {
              console.log(`[send-push] Deleted expired subscription ${sub.id}`);
            }
          }

          return { success: false, id: sub.id, error: error.message, statusCode: error.statusCode };
        }
      })
    );

    // Calculate results
    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)).length;

    console.log("[send-push] Push notification completed:", {
      notificationId: notificationRecord.id,
      total: subscriptionCount,
      successful,
      failed,
    });

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      notification_id: notificationRecord.id,
      total: subscriptionCount,
      successful,
      failed,
      title: trimmedTitle,
      body: trimmedBody,
    });
  } catch (error) {
    console.error("[send-push] Send push notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error instanceof Error ? error.message : "Unknown error",
      details: error,
    });
  }
}
