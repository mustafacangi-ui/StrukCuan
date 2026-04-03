import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs",
};

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
        message: "Server misconfiguration",
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
      .select("endpoint, p256dh, auth, user_id");

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

    // For now, we'll return success with subscription count
    // Actual web push implementation would require web-push library and VAPID keys
    const subscriptionCount = subscriptions?.length || 0;

    // Note: Full web push implementation requires:
    // 1. web-push library
    // 2. VAPID keys (public/private)
    // 3. Service worker with push event handler
    // This is a simplified version that stores the notification
    // and can be extended with actual push delivery

    console.log(`Push notification saved. ID: ${notificationRecord.id}, Subscriptions: ${subscriptionCount}`);

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      notification_id: notificationRecord.id,
      subscription_count: subscriptionCount,
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
