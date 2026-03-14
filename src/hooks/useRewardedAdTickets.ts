import { supabase } from "@/lib/supabase";

/**
 * Grants a ticket via Supabase RPC "grant_ticket".
 * RPC inserts into: ad_ticket_events (user_id, event_type='rewarded', week_id)
 * RPC updates: user_stats (tiket + 1)
 * Requires: grant_ticket RPC, ad_ticket_events table, user_stats table.
 */
export async function grantTicket() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error("Please login");
  }
  const { error } = await supabase.rpc("grant_ticket");
  if (error) {
    console.error("Grant ticket failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    throw new Error(error.message ?? "Failed to grant ticket");
  }
}
