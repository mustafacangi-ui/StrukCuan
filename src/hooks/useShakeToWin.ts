import { supabase } from "@/lib/supabase";
import { grantTickets } from "@/lib/grantTickets";

export type ShakeResult = { success: true; ticketsAdded: number; streak: number; totalTickets: number; lastReward: number } | { success: false; error: string };

export async function shakeToWin(): Promise<ShakeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, error: "Please login" };
  }
  const userId = sessionData.session.user.id;
  const jakartaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  console.log('[LuckyShake] start', { userId, jakartaToday });

  try {
    // 1. Fetch user_stats (check last shake date)
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('shake_last_at, shake_total_tickets, shake_streak, shake_days_this_week, shake_last_reward, tiket')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) {
      console.error("[LuckyShake] Fetch error", statsError);
      throw statsError;
    }

    let currentStreak = userStats?.shake_streak || 0;
    const totalShakeTickets = userStats?.shake_total_tickets || 0;

    if (userStats?.shake_last_at) {
      const lastShakeDate = new Date(userStats.shake_last_at).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Jakarta'
      });

      if (lastShakeDate === jakartaToday) {
        console.log('[LuckyShake] BLOCKED — already used today');
        return { success: false, error: "SHAKE_ALREADY_USED" };
      }
      
      // Streak Calculation (If yesterday in Jakarta, increment. Otherwise, reset to 1)
      const yesterday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayJakartaStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      
      if (lastShakeDate === yesterdayJakartaStr) {
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

    console.log('[LuckyShake] generated reward', tickets);

    // 3. FIRST lock the shake by writing shake_last_at and shake_last_reward
    console.log('[LuckyShake] locking turn...');
    const { error: lockError } = await supabase
      .from('user_stats')
      .update({ 
        shake_last_at: new Date().toISOString(),
        shake_last_reward: tickets,
        shake_streak: currentStreak,
        shake_days_this_week: (userStats?.shake_days_this_week || 0) + 1,
        shake_total_tickets: totalShakeTickets + tickets
      })
      .eq('user_id', userId);

    if (lockError) {
      console.log('[LuckyShake] lock error', lockError);
      return { success: false, error: 'LOCK_FAILED' };
    }

    console.log('[LuckyShake] lock success');

    // 4. Grant tickets using shared helper
    try {
      await grantTickets(userId, tickets);
      console.log('[LuckyShake] reward success');
    } catch (grantError: any) {
      console.log('[LuckyShake] reward error', grantError);
      // Turn is locked, but ticket grant failed. 
      // Return false so UI doesn't show success, but error indicates turn was used.
      return { success: false, error: 'GRANT_FAILED' };
    }

    return { 
      success: true, 
      ticketsAdded: tickets, 
      streak: currentStreak, 
      totalTickets: totalShakeTickets + tickets, // Note: this is total from shakes specifically
      lastReward: tickets
    };
  } catch (err: any) {
    console.log('[LuckyShake] error', err);
    return { success: false, error: err.message ?? "Failed" };
  }
}
