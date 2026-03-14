import { supabase } from "@/lib/supabase";

/**
 * Grants a ticket via Supabase RPC "grant_ticket".
 * RPC inserts into: ad_ticket_events (user_id, event_type='rewarded', week_id)
 * RPC updates: user_stats (tiket + 1)
 * Requires: grant_ticket RPC, ad_ticket_events table, user_stats table.
 */
export async function grantTicket() {
  console.log("[grantTicket] Starting...");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error("[grantTicket] No session - user not logged in");
    throw new Error("Please login");
  }
  const userId = sessionData.session.user?.id;
  console.log("[grantTicket] User ID:", userId, "| Calling grant_ticket RPC...");

  const { data, error } = await supabase.rpc("grant_ticket");

  if (error) {
    console.error("[grantTicket] RPC failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message ?? "Failed to grant ticket");
  }

  console.log("[grantTicket] RPC success. Response:", data);
  return data;
}
