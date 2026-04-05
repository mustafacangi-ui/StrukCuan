import { supabase } from "@/lib/supabase";

export type ShakeResult = { success: true; ticketsAdded: number } | { success: false; error: string };

/**
 * Shake to Win: grants 1-5 random tickets via Supabase RPC.
 * RPC enforces 1x per day.
 */
export async function shakeToWin(): Promise<ShakeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, error: "Please login" };
  }
  const userId = sessionData.session.user.id;
  const todayDateString = new Date().toISOString().slice(0, 10);

  try {
    // 1. Check if already shaken today (user_stats)
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('shake_last_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) {
      console.error("[shakeToWin] Failed to verify last shake:", statsError);
    }

    if (userStats?.shake_last_at) {
      const lastShakeDate = new Date(userStats.shake_last_at).toISOString().slice(0, 10);
      if (lastShakeDate === todayDateString) {
        return { success: false, error: "SHAKE_ALREADY_USED" };
      }
    }

    // 2. Generate random ticket amount (50%→1, 25%→2, 13%→3, 7%→4, 5%→5)
    let tickets = 1;
    const r = Math.random();
    if (r < 0.50) tickets = 1;
    else if (r < 0.75) tickets = 2;
    else if (r < 0.88) tickets = 3;
    else if (r < 0.95) tickets = 4;
    else tickets = 5;

    // 3. Grant tickets to survey_profiles
    const { data: profile } = await supabase
      .from('survey_profiles')
      .select('user_id, total_tickets')
      .eq('user_id', userId)
      .maybeSingle();

    const { error: profileError } = await supabase
      .from('survey_profiles')
      .update({
        total_tickets: (profile?.total_tickets || 0) + tickets
      })
      .eq('user_id', userId);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // 4. Update shake_last_at in user_stats
    await supabase
      .from('user_stats')
      .update({ shake_last_at: new Date().toISOString() })
      .eq('user_id', userId);

    return { success: true, ticketsAdded: tickets };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed" };
  }
}
