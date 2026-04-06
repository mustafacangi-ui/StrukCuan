import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

/**
 * Grants +1 ticket for watching an ad.
 * Uses shared grantTickets() to update BOTH user_stats.tiket + survey_profiles.total_tickets.
 */
export async function grantTicket() {
  console.log("[Ads] completed sequence");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error("[Ads] update error", "No session - user not logged in");
    throw new Error("Please login");
  }
  const userId = sessionData.session.user?.id;
  console.log("[Ads] granting ticket for user:", userId);

  // 1. Track ad event for progress bars
  const { error: eventError } = await supabase
    .from('ad_ticket_events')
    .insert({
      user_id: userId,
      event_type: 'rewarded',
      week_id: new Date().toISOString().slice(0, 10),
    });

  if (eventError) {
    console.error("[Ads] update error", eventError);
    throw new Error("Failed to track ad view: " + eventError.message);
  }

  // 2. Read current tiket for logging
  const { data: statsRow } = await supabase
    .from('user_stats')
    .select('tiket')
    .eq('user_id', userId)
    .maybeSingle();

  const previousTickets = statsRow?.tiket ?? 0;
  console.log("[Ads] previous tiket", previousTickets);

  // 3. Grant +1 ticket using shared helper (updates BOTH stores)
  try {
    const newTickets = await grantTickets(userId, 1);
    console.log("[Ads] new tiket", newTickets);
    console.log("[Ads] update success");
    return { success: true };
  } catch (error: any) {
    console.error("[Ads] update error", error);
    throw error;
  }
}
