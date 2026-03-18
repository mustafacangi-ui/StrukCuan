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

  const { data, error } = await supabase.rpc("shake_to_win");

  if (error) {
    if (error.message?.includes("SHAKE_ALREADY_USED")) {
      return { success: false, error: "SHAKE_ALREADY_USED" };
    }
    if (error.message?.includes("WEEKLY_LIMIT_REACHED")) {
      return { success: false, error: "WEEKLY_LIMIT_REACHED" };
    }
    return { success: false, error: error.message ?? "Failed" };
  }

  const ticketsAdded = (data as { tickets_added?: number })?.tickets_added ?? 0;
  return { success: true, ticketsAdded };
}
