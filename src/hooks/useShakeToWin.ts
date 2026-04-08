import { supabase } from "@/lib/supabase";

export type ShakeResult = 
  | { success: true; ticketsAdded: number; newWeeklyTotal: number } 
  | { success: false; error: string };

/**
 * atomic shakeToWin - Calls the Supabase RPC shake_to_win()
 * This handles daily limits, weight probabilities, weekly counting, 
 * and ticket granting in a single database transaction.
 */
export async function shakeToWin(): Promise<ShakeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, error: "Please login" };
  }
  
  const userId = sessionData.session.user.id;
  console.log('[LuckyShake/RPC] Initiating...', { userId });

  try {
    // Call the atomic RPC function
    const { data, error } = await supabase.rpc('shake_to_win');

    if (error) {
      console.error("[LuckyShake/RPC] Error response:", error);
      // Map common PG error codes or messages if needed
      return { success: false, error: error.message || "FAILED" };
    }

    if (data && data.success) {
      console.log('[LuckyShake/RPC] Success:', data);
      return { 
        success: true, 
        ticketsAdded: data.tickets_added,
        newWeeklyTotal: data.new_weekly_total
      };
    } else {
      console.warn('[LuckyShake/RPC] Failed:', data?.error || "Unknown error");
      return { success: false, error: data?.error || "FAILED" };
    }
  } catch (err: any) {
    console.error('[LuckyShake/RPC] Exception:', err);
    return { success: false, error: err.message ?? "Connection failed" };
  }
}
