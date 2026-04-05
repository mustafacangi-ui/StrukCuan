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
  console.log("[grantTicket] User ID:", userId, "| Granting ticket directly...");

  // 1. Track ad event for progress bars
  const { error: eventError } = await supabase
    .from('ad_ticket_events')
    .insert({
      user_id: userId,
      event_type: 'rewarded',
      week_id: new Date().toISOString().slice(0, 10),
    });

  if (eventError) {
    console.error("[grantTicket] Event track failed:", eventError);
    throw new Error("Failed to track ad view: " + eventError.message);
  }

  // 2. Grant ticket directly to survey_profiles
  const { data: profile } = await supabase
    .from('survey_profiles')
    .select('user_id, total_tickets')
    .eq('user_id', userId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('survey_profiles')
    .update({
      total_tickets: (profile?.total_tickets || 0) + 1
    })
    .eq('user_id', userId);

  if (error) {
    console.error("[grantTicket] Ticket update failed:", error);
    throw new Error(error.message ?? "Failed to grant ticket");
  }

  console.log("[grantTicket] Ticket granted successfully");
  return { success: true };
}
