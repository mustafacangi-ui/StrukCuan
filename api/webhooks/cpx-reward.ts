import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = {
  runtime: "nodejs",
};

function getTicketCount(minutes: number): number {
  if (minutes < 1) return 1;
  if (minutes <= 3) return 2;
  return 3;
}

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function isSupabaseAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("invalid api key") || m.includes("invalid jwt");
}

/** PostgREST: schema cache / relation bulunamadı (public.users yoksa). */
function isUsersTableUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    error.code === "PGRST205" ||
    error.code === "42P01"
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const transId = String(req.query.trans_id ?? "");
    const incomingHash = String(req.query.hash ?? "");
    const secret = process.env.CPX_SECRET_KEY ?? "";

    const isDevelopment = process.env.NODE_ENV === "development";
    const bypassHash = isDevelopment;

    if (!transId || !incomingHash) {
      return res.status(403).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    if (!bypassHash) {
      if (!secret) {
        return res.status(403).json({
          success: false,
          message: "Invalid hash",
        });
      }

      const generatedHash = crypto.createHash("md5").update(`${transId}-${secret}`).digest("hex");

      if (generatedHash.toLowerCase() !== incomingHash.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Invalid hash",
        });
      }
    }

    const status = String(req.query.status ?? "");
    const userId = String(req.query.user_id ?? "");
    const loiRaw = req.query.survey_loi;
    const loiStr = Array.isArray(loiRaw) ? loiRaw[0] : loiRaw;
    const surveyLoiParsed = Number.parseFloat(String(loiStr ?? ""));
    const survey_loi = Number.isFinite(surveyLoiParsed) ? surveyLoiParsed : 0;

    if (status !== "1" && status !== "3") {
      return res.status(200).json({
        success: true,
        message: "Ignored status",
      });
    }

    const tickets = getTicketCount(survey_loi);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration",
      });
    }

    console.log({
      supabaseUrl: process.env.SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
    });

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

    const { data: pingData, error: pingError } = await supabase
      .from("user_stats")
      .select("user_id")
      .limit(1);

    console.log({ data: pingData, error: pingError });

    if (pingError) {
      return res.status(500).json({
        success: false,
        message: "Supabase connection failed",
        error: pingError.message,
      });
    }

    if (!isValidUuid(userId)) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log({
      receivedUserId: userId,
      receivedUserIdType: typeof userId,
    });

    const { data: existingUserStats, error: existingUserStatsError } = await supabase
      .from("user_stats")
      .select("user_id, total_tickets, weekly_tickets, lifetime_tickets")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingUserStatsError) {
      console.error("CPX webhook user_stats select:", existingUserStatsError);
      if (isSupabaseAuthError(existingUserStatsError.message)) {
        return res.status(500).json({
          success: false,
          message: "Supabase connection failed",
          error: existingUserStatsError.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Webhook crashed",
        error: existingUserStatsError.message,
      });
    }

    let statsRow = existingUserStats;

    if (!statsRow) {
      const { data: userInUsers, error: userInUsersError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      console.log({
        userStatsRowMissing: true,
        userInUsers,
        userInUsersError: userInUsersError?.message ?? null,
        userInUsersErrorCode: userInUsersError?.code ?? null,
      });

      let userExists = Boolean(userInUsers);

      if (!userExists && (isUsersTableUnavailable(userInUsersError) || userInUsersError == null)) {
        const { data: authData, error: authLookupError } = await supabase.auth.admin.getUserById(userId);
        console.log({
          authUserId: authData?.user?.id ?? null,
          authLookupError: authLookupError?.message ?? null,
        });
        userExists = Boolean(authData?.user) && !authLookupError;
      } else if (!userExists && userInUsersError && !isUsersTableUnavailable(userInUsersError)) {
        console.error("CPX webhook users table select:", userInUsersError);
        return res.status(500).json({
          success: false,
          message: "Webhook crashed",
          error: userInUsersError.message,
        });
      }

      if (userExists) {
        const { error: insertError } = await supabase.from("user_stats").insert({
          user_id: userId,
          total_tickets: 0,
          weekly_tickets: 0,
          lifetime_tickets: 0,
        });

        if (insertError && insertError.code !== "23505") {
          console.error("CPX webhook user_stats insert:", insertError);
          return res.status(500).json({
            success: false,
            message: "Webhook crashed",
            error: insertError.message,
          });
        }

        const { data: refetched, error: refetchError } = await supabase
          .from("user_stats")
          .select("user_id, total_tickets, weekly_tickets, lifetime_tickets")
          .eq("user_id", userId)
          .maybeSingle();

        if (refetchError) {
          console.error("CPX webhook user_stats refetch:", refetchError);
          return res.status(500).json({
            success: false,
            message: "Webhook crashed",
            error: refetchError.message,
          });
        }

        statsRow = refetched;
      }

      if (!statsRow) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    const curTotal = Math.max(0, Number(statsRow.total_tickets ?? 0));
    const curWeekly = Math.max(0, Number(statsRow.weekly_tickets ?? 0));
    const curLifetime = Math.max(0, Number(statsRow.lifetime_tickets ?? 0));

    const { error: updateError } = await supabase
      .from("user_stats")
      .update({
        total_tickets: curTotal + tickets,
        weekly_tickets: curWeekly + tickets,
        lifetime_tickets: curLifetime + tickets,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("CPX webhook user_stats update:", updateError);
      if (isSupabaseAuthError(updateError.message)) {
        return res.status(500).json({
          success: false,
          message: "Supabase connection failed",
          error: updateError.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Webhook crashed",
        error: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tickets added",
      user_id: userId,
      tickets,
      hash_bypassed: bypassHash || undefined,
      warning: bypassHash ? "Development mode: hash validation bypassed" : undefined,
    });
  } catch (error) {
    console.error("CPX webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook crashed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
