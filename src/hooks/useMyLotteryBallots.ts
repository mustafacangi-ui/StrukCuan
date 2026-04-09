import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const MY_LOTTERY_BALLOTS_QUERY_KEY = ["my_lottery_ballots"] as const;

/** Draw codes from weekly_draw_entries for the current user & current week. */
async function fetchMyBallots(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_my_lottery_ballots");
  if (error) {
    console.error("[useMyLotteryBallots] RPC failed:", error);
    throw error;
  }
  // The RPC now returns an array of strings (draw codes)
  return (data ?? []) as string[];
}

export function useMyLotteryBallots(userId: string | undefined) {
  return useQuery({
    queryKey: [...MY_LOTTERY_BALLOTS_QUERY_KEY, userId],
    queryFn: fetchMyBallots,
    enabled: !!userId,
  });
}
