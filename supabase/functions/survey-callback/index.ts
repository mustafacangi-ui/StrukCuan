/**
 * Survey Completion Webhook
 * CPX Research / Pollfish anket tamamlandığında bu endpoint çağrılır.
 * Body örneği: { user_id, provider, user_cuan, gross_profit, transaction_id?, survey_id? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    let body = {};
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        body = await req.json();
      }
    } catch (e) {
      // Ignored: body might be empty
    }

    const payload = { ...queryParams, ...body };
    console.log("[SurveyCallback] Incoming payload:", JSON.stringify(payload));

    const user_id = payload.user_id ?? payload.userId ?? payload.ext_user_id;
    const provider = (payload.provider ?? "cpx").toLowerCase();
    const payout = payload.payout ?? payload.amount ?? 0;
    const transaction_id = payload.transaction_id ?? payload.transactionId ?? payload.trans_id ?? null;
    const status = String(payload.status ?? "completed");
    const loi = payload.loi ?? null;
    const survey_id = payload.survey_id ?? payload.surveyId ?? null;
    const country_code = (payload.country_code ?? payload.countryCode ?? "ID").toUpperCase().slice(0, 2);

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase.rpc("process_survey_completion", {
      p_user_id: user_id,
      p_provider: provider,
      p_transaction_id: transaction_id,
      p_payout: Number(payout),
      p_status: status,
      p_loi: loi ? Number(loi) : null,
      p_survey_id: survey_id,
      p_country_code: country_code,
      p_metadata: payload,
    });


    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(data ?? { success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
