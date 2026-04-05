import { supabase } from "@/lib/supabase";

/**
 * Grants +2 tickets for Red Label (deal) sharing.
 * Calls grant_deal_tickets RPC.
 */
export async function grantDealTickets() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }

  const userId = sessionData.session.user.id;

  const { data: profile } = await supabase
    .from('survey_profiles')
    .select('user_id, total_tickets')
    .eq('user_id', userId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('survey_profiles')
    .update({
      total_tickets: (profile?.total_tickets || 0) + 2
    })
    .eq('user_id', userId);

  if (error) {
    console.error("[grantDealTickets] Update failed:", error);
    throw new Error(error.message ?? "Failed to grant tickets");
  }

  return data;
}
