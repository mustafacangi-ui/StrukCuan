/**
 * BitLabs Surveys Proxy
 * Fetches survey list from BitLabs API and returns to client.
 * Requires: BITLABS_API_TOKEN in Supabase secrets
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid") ?? "";
    const token = url.searchParams.get("token") ?? Deno.env.get("BITLABS_API_TOKEN") ?? "";

    if (!token) {
      return new Response(
        JSON.stringify({ surveys: [], error: "BITLABS_API_TOKEN not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = new URL("https://api.bitlabs.ai/v2/client/surveys");
    apiUrl.searchParams.set("token", token);
    if (uid) apiUrl.searchParams.set("uid", uid);
    apiUrl.searchParams.set("sdk", "CUSTOM");

    const res = await fetch(apiUrl.toString(), {
      headers: { "Accept": "application/json" },
    });

    const data = await res.json();
    const surveys = data?.data?.surveys ?? data?.surveys ?? [];

    return new Response(
      JSON.stringify({ surveys }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ surveys: [], error: String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
