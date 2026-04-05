import { supabase } from "@/lib/supabase";

/**
 * Convert 100 Cuan to 1 Ticket via Supabase RPC.
 */
export async function convertCuanToTicket(): Promise<{ ticketsAdded: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }
  const userId = sessionData.session.user.id;

  // Read current cuan and tickets from survey_profiles
  const { data: profile } = await supabase
    .from('survey_profiles')
    .select('user_id, total_cuan, total_tickets')
    .eq('user_id', userId)
    .maybeSingle();

  const currentCuan = profile?.total_cuan || 0;
  
  if (currentCuan < 100) {
    throw new Error("INSUFFICIENT_CUAN");
  }

  // Deduct 100 Cuan, add 1 ticket
  const { error } = await supabase
    .from('survey_profiles')
    .update({
      total_cuan: currentCuan - 100,
      total_tickets: (profile?.total_tickets || 0) + 1
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message ?? "Failed to convert");
  }

  // Best effort: keep legacy user_stats down in sync to avoid UI bugs
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
