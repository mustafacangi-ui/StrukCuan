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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const transId = String(req.query.trans_id ?? "");
    const incomingHash = String(req.query.hash ?? "");
    const secret = process.env.CPX_SECRET_KEY ?? "";

    if (!secret || !transId || !incomingHash) {
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

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration",
      });
    }

    if (!isValidUuid(userId)) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: row, error: selectError } = await supabase
      .from("user_stats")
      .select("total_tickets, weekly_tickets, lifetime_tickets")
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError) {
      console.error("CPX webhook user_stats select:", selectError);
      return res.status(500).json({
        success: false,
        message: "Webhook crashed",
        error: selectError.message,
      });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const curTotal = Math.max(0, Number(row.total_tickets ?? 0));
    const curWeekly = Math.max(0, Number(row.weekly_tickets ?? 0));
    const curLifetime = Math.max(0, Number(row.lifetime_tickets ?? 0));

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
