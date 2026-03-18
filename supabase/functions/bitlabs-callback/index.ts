/**
 * BitLabs Survey Completion Callback
 * BitLabs sends GET request with params: uid, currency_value, tx, etc.
 * Configure this URL in BitLabs Dashboard: https://YOUR_PROJECT.supabase.co/functions/v1/bitlabs-callback
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
    const uid = url.searchParams.get("uid") ?? url.searchParams.get("user_id") ?? "";
    const value = parseFloat(url.searchParams.get("currency_value") ?? url.searchParams.get("value") ?? "0") || 0;
    const tx = url.searchParams.get("tx") ?? url.searchParams.get("transaction_id") ?? null;
    const country = (url.searchParams.get("country") ?? "ID").toUpperCase().slice(0, 2);

    if (!uid) {
      return new Response(
        JSON.stringify({ success: false, error: "uid required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userCuan = Math.round(value);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase.rpc("survey_completion_callback", {
      p_user_id: uid,
      p_provider: "bitlabs",
      p_user_cuan: userCuan,
      p_gross_profit: 0,
      p_transaction_id: tx,
      p_survey_id: null,
      p_country_code: country,
      p_metadata: null,
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
