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
  // Supabase RPC on TABLE returning functions always returns an array of objects
  // e.g., [{ id_text: "ABCDEF" }]
  const rows = (data ?? []) as any[];
  return rows.map((r) => String(r.id_text || r.id || r));
}

export function useMyLotteryBallots(userId: string | undefined) {
  return useQuery({
    queryKey: [...MY_LOTTERY_BALLOTS_QUERY_KEY, userId],
    queryFn: fetchMyBallots,
    enabled: !!userId,
    staleTime: 0,
  });
}
