import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

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
  const jakartaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  console.log('[LuckyShake] Jakarta today', jakartaToday);

  try {
    // 1. Fetch user_stats (check last shake date natively in Jakarta time)
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('shake_last_at, shake_total_tickets, shake_streak, shake_days_this_week, shake_last_reward, tiket')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) {
      console.error("[LuckyShake] Failed to verify last shake:", statsError);
    }

    console.log('[LuckyShake] user before', userStats);

    let currentStreak = userStats?.shake_streak || 0;
    const totalTickets = userStats?.shake_total_tickets || 0;

    if (userStats?.shake_last_at) {
      // Parse last shake time as Jakarta
      const lastShakeDate = new Date(userStats.shake_last_at).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Jakarta'
      });

      console.log('[LuckyShake] shake_last_at', userStats.shake_last_at);
      console.log('[LuckyShake] lastShakeDate (Jakarta)', lastShakeDate);
      console.log('[LuckyShake] jakartaToday', jakartaToday);

      if (lastShakeDate === jakartaToday) {
        console.log('[LuckyShake] BLOCKED — already used today');
        return { success: false, error: "SHAKE_ALREADY_USED" };
      }
      
      // Streak Calculation (If yesterday in Jakarta, increment. Otherwise, reset to 1)
      const yesterday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      yesterday.setDate(yesterday.getDate() - 1);
      const yYear = yesterday.getFullYear();
      const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yDate = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayJakartaStr = `${yYear}-${yMonth}-${yDate}`;
      
      const lastShakeTime = new Date(userStats.shake_last_at);
      const lastJakartaTime = new Date(lastShakeTime.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const lastYear = lastJakartaTime.getFullYear();
      const lastMonth = String(lastJakartaTime.getMonth() + 1).padStart(2, '0');
      const lastDate2 = String(lastJakartaTime.getDate()).padStart(2, '0');
      const lastJakartaDateString = `${lastYear}-${lastMonth}-${lastDate2}`;

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

    console.log('[LuckyShake] reward generated', tickets);

    // 3. FIRST lock the shake by writing shake_last_at — BEFORE granting tickets
    //    This prevents double-use even if ticket grant fails.
    console.log('[LuckyShake] writing shake_last_at BEFORE granting tickets');
    const newTotalTickets = totalTickets + tickets;

    const { error: lockError } = await supabase
      .from('user_stats')
      .update({ 
        shake_last_at: new Date().toISOString(),
        shake_total_tickets: newTotalTickets,
        shake_streak: currentStreak,
        shake_days_this_week: (userStats?.shake_days_this_week || 0) + 1,
        shake_last_reward: tickets
      })
      .eq('user_id', userId);

    if (lockError) {
      console.error('[LuckyShake] shake_last_at update FAILED — aborting', lockError);
      console.log('[LuckyShake] update error', lockError);
      return { success: false, error: 'Failed to lock shake: ' + lockError.message };
    }

    console.log('[LuckyShake] shake_last_at locked successfully');

    // 4. Grant tickets using shared helper (updates BOTH user_stats.tiket + survey_profiles)
    try {
      console.log('[LuckyShake] updating user_stats.tiket');
      console.log('[LuckyShake] updating survey_profiles.total_tickets');
      await grantTickets(userId, tickets);
      console.log('[LuckyShake] update success');
    } catch (grantError: any) {
      console.error('[LuckyShake] update error', grantError);
      // Tickets failed but shake is already locked. This is safer than allowing double-use.
      return { success: false, error: 'Shake locked but ticket grant failed: ' + (grantError?.message ?? 'unknown') };
    }

    const shakeRightAvailable = false;
    console.log('[LuckyShake] available', shakeRightAvailable);

    return { 
      success: true, 
      ticketsAdded: tickets, 
      streak: currentStreak, 
      totalTickets: newTotalTickets,
      lastReward: tickets
    };
  } catch (err: any) {
    console.error('[LuckyShake] update error', err);
    return { success: false, error: err.message ?? "Failed" };
  }
}
