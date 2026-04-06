import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

/**
 * Grants +2 tickets for Red Label (deal) sharing.
 * Uses shared grantTickets() to update BOTH user_stats.tiket + survey_profiles.
 */
export async function grantDealTickets() {
  console.log('[Deal] grantDealTickets start');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }

  const userId = sessionData.session.user.id;
  console.log('[Deal] granting 2 tickets to user:', userId);

  const newTotal = await grantTickets(userId, 2);
  console.log('[Deal] grantDealTickets success, new total:', newTotal);

  return { success: true, newTotal };
}
