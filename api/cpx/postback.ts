import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = {
  runtime: "nodejs",
};

/**
 * Duration-based ticket calculation
 * - < 1 minute: 1 ticket
 * - 1-3 minutes: 2 tickets
 * - > 3 minutes: 3 tickets
 */
function calculateTicketsFromDuration(minutes: number | null | undefined): number {
  if (minutes === null || minutes === undefined || minutes < 1) return 1;
  if (minutes <= 3) return 2;
  return 3;
}

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function verifyCpxHash(transId: string, receivedHash: string, secret: string): boolean {
  if (!transId || !receivedHash || !secret) return false;
  const expected = crypto.createHash("md5").update(`${transId}-${secret}`).digest("hex");
  return expected.toLowerCase() === receivedHash.toLowerCase();
}

/**
 * Parse survey_started_at from various formats
 */
function parseSurveyStartedAt(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * CPX Research Postback Handler
 * Endpoint: /api/cpx/postback
 * 
 * Features:
 * - Duplicate transaction_id prevention via survey_rewards unique constraint
 * - Duration-based ticket calculation (1-3 tickets based on LOI)
 * - survey_started_at tracking support
 * - Backward compatible with existing cpx_ticket_transactions
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Support both GET (query params) and POST (body) methods
    const params = req.method === "GET" ? req.query : req.body;
    
    // Extract required parameters
    const transId = String(params.trans_id ?? params.transactionId ?? "").trim();
    const userId = String(params.user_id ?? params.userId ?? "").trim();
    const status = String(params.status ?? "").trim();
    const hash = String(params.hash ?? params.sig ?? "").trim();
    const surveyId = String(params.survey_id ?? params.surveyId ?? "").trim() || null;
    
    // Duration-based fields
    const loiRaw = params.survey_loi ?? params.loi ?? params.length_of_interview ?? params.duration;
    const surveyLoi = loiRaw ? parseInt(String(loiRaw), 10) : null;
    
    // Survey timing tracking
    const surveyStartedAt = parseSurveyStartedAt(
      params.survey_started_at ?? params.surveyStartedAt ?? params.started_at ?? null
    );
    
    const surveyCompletedAtRaw = params.completed_at ?? params.completedAt ?? params.timestamp ?? null;
    const surveyCompletedAt = surveyCompletedAtRaw 
      ? parseSurveyStartedAt(String(surveyCompletedAtRaw)) 
      : new Date().toISOString();

    const countryCode = String(params.country_code ?? params.countryCode ?? "ID").toUpperCase().slice(0, 2);

    // Validate required fields
    if (!transId || !hash) {
      return res.status(400).json({
        success: false,
        error: "missing_parameters",
        message: "trans_id and hash are required",
      });
    }

    // Verify hash
    const secret = process.env.CPX_SECRET_KEY ?? "";
    if (!verifyCpxHash(transId, hash, secret)) {
      console.warn("[CPX Postback] Invalid hash", { transId, receivedHash: hash });
      return res.status(403).json({
        success: false,
        error: "invalid_hash",
        message: "Hash verification failed",
      });
    }

    // Validate user_id format and presence
    if (!userId || !isValidUuid(userId)) {
      return res.status(400).json({
        success: false,
        error: "invalid_user_id",
        message: "Valid user_id (UUID) is required",
      });
    }

    // Validate status
    if (!status || !["1", "2", "3"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "invalid_status",
        message: "Status must be 1 (completed), 2 (screenout/reversed), or 3 (bonus)",
      });
    }

    // Check environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[CPX Postback] Missing Supabase configuration");
      return res.status(500).json({
        success: false,
        error: "server_misconfiguration",
        message: "Server configuration error",
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Build raw payload for audit trail
    const rawPayload = {
      ...params,
      received_method: req.method,
      received_at: new Date().toISOString(),
      user_agent: req.headers["user-agent"] ?? null,
      ip: req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? null,
    };

    // For status 2 (screenout/reversed), we record but don't grant tickets
    if (status === "2") {
      const { data, error } = await supabase.rpc("process_cpx_postback", {
        p_user_id: userId,
        p_transaction_id: transId,
        p_status: status,
        p_survey_id: surveyId,
        p_survey_loi: surveyLoi,
        p_survey_started_at: surveyStartedAt,
        p_survey_completed_at: surveyCompletedAt,
        p_hash_verified: true,
        p_raw_payload: rawPayload,
        p_country_code: countryCode,
      });

      if (error) {
        console.error("[CPX Postback] RPC error for screenout:", error);
        return res.status(500).json({
          success: false,
          error: "processing_error",
          message: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        result: "screenout_recorded",
        tickets_granted: 0,
        survey_loi: surveyLoi,
        data,
      });
    }

    // For completed surveys (status 1 or 3), process rewards
    const { data, error } = await supabase.rpc("process_cpx_postback", {
      p_user_id: userId,
      p_transaction_id: transId,
      p_status: status,
      p_survey_id: surveyId,
      p_survey_loi: surveyLoi,
      p_survey_started_at: surveyStartedAt,
      p_survey_completed_at: surveyCompletedAt,
      p_hash_verified: true,
      p_raw_payload: rawPayload,
      p_country_code: countryCode,
    });

    if (error) {
      console.error("[CPX Postback] RPC error:", error);
      
      // Check for duplicate transaction
      if (error.message?.toLowerCase().includes("duplicate") || 
          error.message?.toLowerCase().includes("unique")) {
        return res.status(409).json({
          success: false,
          error: "duplicate_transaction",
          message: "Transaction already processed",
          transaction_id: transId,
        });
      }

      return res.status(500).json({
        success: false,
        error: "processing_error",
        message: error.message,
      });
    }

    // Calculate expected tickets for response
    const expectedTickets = calculateTicketsFromDuration(surveyLoi);

    return res.status(200).json({
      success: true,
      result: "reward_processed",
      transaction_id: transId,
      user_id: userId,
      survey_id: surveyId,
      survey_loi: surveyLoi,
      tickets_granted: data?.tickets_granted ?? expectedTickets,
      lottery_entries_added: data?.lottery_entries_added ?? 0,
      weekly_cap_remaining: data?.weekly_cap_remaining ?? 0,
      survey_started_at: surveyStartedAt,
      survey_completed_at: surveyCompletedAt,
      duplicate: false,
      data,
    });

  } catch (error) {
    console.error("[CPX Postback] Unhandled error:", error);
    
    return res.status(500).json({
      success: false,
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
