import { supabase } from "@/lib/supabase";

/**
 * Grants +1 ticket for watching an ad.
 * Writes to user_stats.tiket (primary cumulative store).
 * Also syncs to survey_profiles.total_tickets (secondary, non-fatal).
 */
export async function grantTicket() {
  console.log("[grantTicket] Starting...");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error("[grantTicket] No session - user not logged in");
    throw new Error("Please login");
  }
  const userId = sessionData.session.user?.id;
  console.log("[grantTicket] User:", userId);

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

  // 2. Grant +1 to user_stats.tiket (primary — this is what UI reads)
  const { data: statsRow } = await supabase
    .from('user_stats')
    .select('tiket')
    .eq('user_id', userId)
    .maybeSingle();

  const currentTiket = statsRow?.tiket ?? 0;
  const { error: tiketError } = await supabase
    .from('user_stats')
    .update({ tiket: currentTiket + 1 })
    .eq('user_id', userId);

  if (tiketError) {
    console.error("[grantTicket] user_stats.tiket update failed:", tiketError);
    throw new Error(tiketError.message ?? "Failed to grant ticket");
  }

  console.log("[grantTicket] user_stats.tiket updated to", currentTiket + 1);

  // 3. Also sync to survey_profiles.total_tickets (non-fatal secondary store)
  try {
    const { data: profile } = await supabase
      .from('survey_profiles')
      .select('total_tickets')
      .eq('user_id', userId)
      .maybeSingle();

    await supabase
      .from('survey_profiles')
      .update({ total_tickets: (profile?.total_tickets || 0) + 1 })
      .eq('user_id', userId);

    console.log("[grantTicket] survey_profiles synced");
  } catch (spErr) {
    console.warn("[grantTicket] survey_profiles sync failed (non-fatal):", spErr);
  }

  console.log("[grantTicket] Ticket granted successfully");
  return { success: true };
}
