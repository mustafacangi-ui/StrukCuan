import { createClient } from "@supabase/supabase-js";
import {
  isValidUuid,
  logCpxWebhook,
  normalizeCpxRewardPayload,
  parseWebhookRequest,
  processCompletedReward,
  processReversalReward,
  verifyCpxHash,
} from "../_lib/cpxRewardWebhook.js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** Vercel’de `CPX_WEBHOOK_DEBUG=1` iken hash doğrulamasından önce query/body döner; teşhis sonrası kapatın. */
function isEarlyDebugEnabled(): boolean {
  const v = process.env.CPX_WEBHOOK_DEBUG;
  return v === "1" || v === "true";
}

function envFlags() {
  return {
    hasSecret: !!process.env.CPX_SECRET_KEY,
    hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, 405);
    }

    console.log({
      hasSecret: !!process.env.CPX_SECRET_KEY,
      hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const secret = process.env.CPX_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { merged, query, body } = await parseWebhookRequest(request);

    if (isEarlyDebugEnabled()) {
      return jsonResponse(
        {
          success: true,
          debug: {
            query,
            body,
            ...envFlags(),
          },
        },
        200
      );
    }

    if (!secret || !supabaseUrl || !serviceKey) {
      logCpxWebhook("error", { reason: "missing_environment_variables", ...envFlags() });
      return jsonResponse({ success: false, message: "Missing environment variables" }, 500);
    }

    const payload = normalizeCpxRewardPayload(merged);

    if (!payload.trans_id || !payload.user_id || payload.status === "") {
      logCpxWebhook("error", { reason: "invalid_request", payload: merged });
      return jsonResponse({ success: false, message: "Invalid request" }, 400);
    }

    if (!isValidUuid(payload.user_id)) {
      logCpxWebhook("error", { reason: "invalid_user_id", user_id: payload.user_id });
      return jsonResponse({ success: false, message: "Invalid user id" }, 400);
    }

    if (!verifyCpxHash(payload.trans_id, payload.hash, secret)) {
      logCpxWebhook("invalid_hash", { trans_id: payload.trans_id });
      return jsonResponse({ success: false, message: "Invalid hash" }, 403);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (payload.status === "1" || payload.status === "3") {
      const { result, tickets } = await processCompletedReward(supabase, payload, true);

      if (result === "duplicate") {
        logCpxWebhook("duplicate", { trans_id: payload.trans_id, user_id: payload.user_id });
        return jsonResponse({ success: true, message: "Already processed" }, 200);
      }

      if (result === "user_not_found") {
        logCpxWebhook("user_not_found", { trans_id: payload.trans_id, user_id: payload.user_id });
        return jsonResponse({ success: false, message: "User not found" }, 404);
      }

      logCpxWebhook("success", {
        trans_id: payload.trans_id,
        user_id: payload.user_id,
        status: payload.status,
        tickets,
      });
      return jsonResponse({ success: true, message: "OK" }, 200);
    }

    if (payload.status === "2") {
      const { result } = await processReversalReward(supabase, payload, true);

      if (result === "duplicate") {
        logCpxWebhook("duplicate", { trans_id: payload.trans_id, user_id: payload.user_id, kind: "reversal" });
        return jsonResponse({ success: true, message: "Already processed" }, 200);
      }

      if (result === "user_not_found") {
        logCpxWebhook("user_not_found", { trans_id: payload.trans_id, user_id: payload.user_id });
        return jsonResponse({ success: false, message: "User not found" }, 404);
      }

      if (result === "reversal_not_found") {
        logCpxWebhook("reversal", {
          trans_id: payload.trans_id,
          user_id: payload.user_id,
          note: "no_target_transaction",
        });
        return jsonResponse({ success: true, message: "OK" }, 200);
      }

      logCpxWebhook("reversal", { trans_id: payload.trans_id, user_id: payload.user_id, note: "revoked" });
      return jsonResponse({ success: true, message: "OK" }, 200);
    }

    logCpxWebhook("error", { reason: "unknown_status", status: payload.status, trans_id: payload.trans_id });
    return jsonResponse({ success: true, message: "OK" }, 200);
  } catch (error) {
    console.error("CPX webhook fatal error:", error);
    logCpxWebhook("error", {
      reason: "fatal",
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      {
        success: false,
        message: "Webhook crashed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
