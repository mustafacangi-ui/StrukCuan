import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

/**
 * Grants +2 tickets for Red Label (deal) sharing.
 * Uses shared grantTickets() to update BOTH user_stats.tiket + survey_profiles.
 */
export async function grantDealTickets() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }

  const userId = sessionData.session.user.id;
  console.log('[DealApprove] start', { userId }); // Using DealApprove as a proxy or just general flow

  try {
    const newTotal = await grantTickets(userId, 2);
    console.log('[DealApprove] reward success');
    return { success: true, newTotal };
  } catch (error) {
    console.log('[DealApprove] reward error', error);
    throw error;
  }
}
