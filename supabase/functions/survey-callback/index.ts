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
    const body = await req.json();
    const user_id = body.user_id ?? body.userId;
    const provider = (body.provider ?? "other").toLowerCase();
    const user_cuan = body.user_cuan ?? body.userCuan ?? 0;
    const gross_profit = body.gross_profit ?? body.grossProfit ?? 0;
    const transaction_id = body.transaction_id ?? body.transactionId ?? null;
    const survey_id = body.survey_id ?? body.surveyId ?? null;
    const country_code = (body.country_code ?? body.countryCode ?? "ID").toUpperCase().slice(0, 2);

    if (!user_id || !provider) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id and provider required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase.rpc("survey_completion_callback", {
      p_user_id: user_id,
      p_provider: provider,
      p_user_cuan: Number(user_cuan),
      p_gross_profit: Number(gross_profit),
      p_transaction_id: transaction_id,
      p_survey_id: survey_id,
      p_country_code: country_code,
      p_metadata: body.metadata ?? null,
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
