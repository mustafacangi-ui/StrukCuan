import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

/**
 * Grants +1 ticket for watching an ad.
 * Uses shared grantTickets() to update BOTH user_stats.tiket + survey_profiles.total_tickets.
 */
export async function grantTicket() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }
  const userId = sessionData.session.user?.id;
  console.log("[Ads] start", { userId });

  try {
    // 1. Track ad event
    const { error: eventError } = await supabase
      .from('ad_ticket_events')
      .insert({
        user_id: userId,
        event_type: 'rewarded',
        week_id: new Date().toISOString().slice(0, 10),
      });

    if (eventError) {
      console.log("[Ads] error", eventError);
      throw new Error("Failed to track ad view");
    }

    // 2. Grant +1 ticket using shared helper
    await grantTickets(userId, 1);
    console.log("[Ads] success");
    return { success: true };
  } catch (error: any) {
    console.log("[Ads] error", error);
    throw error;
  }
}
