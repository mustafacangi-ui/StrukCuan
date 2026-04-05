import { supabase } from "@/lib/supabase";

export type ShakeResult = { success: true; ticketsAdded: number; streak: number; totalTickets: number; lastReward: number } | { success: false; error: string };

/**
 * Get the current date in Jakarta timezone (WIB) as "YYYY-MM-DD"
 */
function getJakartaDateString(): string {
  const jakartaTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const year = jakartaTime.getFullYear();
  const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
  const date = String(jakartaTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Shake to Win: grants 1-5 random tickets based on configured 50/25/15/7/3 odds.
 * RPC enforces exactly 1x per day natively locked to Jakarta Timezone.
 */
export async function shakeToWin(): Promise<ShakeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, error: "Please login" };
  }
  const userId = sessionData.session.user.id;
  const jakartaDateString = getJakartaDateString();

  try {
    // 1. Fetch user_stats (check last shake date natively in Jakarta time)
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('shake_last_at, shake_total_tickets, shake_streak, shake_days_this_week, shake_last_reward')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) {
      console.error("[shakeToWin] Failed to verify last shake:", statsError);
    }

    let currentStreak = userStats?.shake_streak || 0;
    const totalTickets = userStats?.shake_total_tickets || 0;

    if (userStats?.shake_last_at) {
      // Parse last shake time as Jakarta
      const lastShakeTime = new Date(userStats.shake_last_at);
      const lastJakartaTime = new Date(lastShakeTime.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      
      const lastYear = lastJakartaTime.getFullYear();
      const lastMonth = String(lastJakartaTime.getMonth() + 1).padStart(2, '0');
      const lastDate = String(lastJakartaTime.getDate()).padStart(2, '0');
      const lastJakartaDateString = `${lastYear}-${lastMonth}-${lastDate}`;

      if (lastJakartaDateString === jakartaDateString) {
        return { success: false, error: "SHAKE_ALREADY_USED" };
      }
      
      // Streak Calculation (If yesterday in Jakarta, increment. Otherwise, reset to 1)
      const yesterday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      yesterday.setDate(yesterday.getDate() - 1);
      const yYear = yesterday.getFullYear();
      const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yDate = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayJakartaStr = `${yYear}-${yMonth}-${yDate}`;
      
      if (lastJakartaDateString === yesterdayJakartaStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    } else {
       currentStreak = 1;
    }

    // 2. Generate random ticket amount (50%→1, 25%→2, 15%→3, 7%→4, 3%→5)
    let tickets = 1;
    const r = Math.random();
    if (r < 0.50) tickets = 1;
    else if (r < 0.75) tickets = 2;
    else if (r < 0.90) tickets = 3;
    else if (r < 0.97) tickets = 4;
    else tickets = 5;

    // 3. Grant tickets to user_stats.tiket (primary ticket store read by UI)
    const { data: statsForUpdate } = await supabase
      .from('user_stats')
      .select('tiket')
      .eq('user_id', userId)
      .maybeSingle();

    const currentTiket = statsForUpdate?.tiket ?? 0;
    const { error: tiketError } = await supabase
      .from('user_stats')
      .update({ tiket: currentTiket + tickets })
      .eq('user_id', userId);

    if (tiketError) {
      console.error('[shakeToWin] Failed to grant tiket:', tiketError);
      return { success: false, error: tiketError.message };
    }

    // 4. Also sync to survey_profiles (non-fatal secondary store)
    try {
      const { data: profile } = await supabase
        .from('survey_profiles')
        .select('total_tickets')
        .eq('user_id', userId)
        .maybeSingle();
      await supabase
        .from('survey_profiles')
        .update({ total_tickets: (profile?.total_tickets || 0) + tickets })
        .eq('user_id', userId);
    } catch (spErr) {
      console.warn('[shakeToWin] survey_profiles sync failed (non-fatal):', spErr);
    }

    // 4. Update shake statistics in user_stats
    const newTotalTickets = totalTickets + tickets;
    
    await supabase
      .from('user_stats')
      .update({ 
        shake_last_at: new Date().toISOString(), // Always store globally as UTC
        shake_total_tickets: newTotalTickets,
        shake_streak: currentStreak,
        shake_days_this_week: (userStats?.shake_days_this_week || 0) + 1, // Just an append for now
        shake_last_reward: tickets
      })
      .eq('user_id', userId);

    return { 
      success: true, 
      ticketsAdded: tickets, 
      streak: currentStreak, 
      totalTickets: newTotalTickets,
      lastReward: tickets
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed" };
  }
}
