import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

/**
 * Convert 100 Cuan to 1 Ticket.
 * Uses shared grantTickets() to update BOTH user_stats.tiket + survey_profiles.
 */
export async function convertCuanToTicket(): Promise<{ ticketsAdded: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }
  const userId = sessionData.session.user.id;

  // Read current cuan from survey_profiles
  const { data: profile } = await supabase
    .from('survey_profiles')
    .select('user_id, total_cuan')
    .eq('user_id', userId)
    .maybeSingle();

  const currentCuan = profile?.total_cuan || 0;
  
  if (currentCuan < 100) {
    throw new Error("INSUFFICIENT_CUAN");
  }

  // Deduct 100 Cuan from survey_profiles
  const { error } = await supabase
    .from('survey_profiles')
    .update({
      total_cuan: currentCuan - 100,
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message ?? "Failed to convert");
  }

  // Grant +1 ticket using shared helper (updates BOTH user_stats.tiket + survey_profiles.total_tickets)
  console.log('[ConvertCuan] granting 1 ticket via grantTickets()');
  await grantTickets(userId, 1);
  console.log('[ConvertCuan] ticket granted successfully');

  // Best effort: keep legacy user_stats.cuan in sync
  try {
    const { data: stats } = await supabase.from('user_stats').select('cuan').eq('user_id', userId).maybeSingle();
    if (stats) {
      await supabase.from('user_stats').update({ cuan: Math.max(0, stats.cuan - 100) }).eq('user_id', userId);
    }
  } catch (err) {
    // Ignore legacy stats sync errors safely
  }

  return { ticketsAdded: 1 };
}
