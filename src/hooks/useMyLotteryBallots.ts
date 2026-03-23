import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const MY_LOTTERY_BALLOTS_QUERY_KEY = ["my_lottery_ballots"] as const;

/** Bigint IDs from lottery_tickets for the current user & current Jakarta week (same rules as grant_ticket). */
async function fetchMyBallots(): Promise<number[]> {
  const { data, error } = await supabase.rpc("get_my_lottery_ballots");
  if (error) {
    console.error("[useMyLotteryBallots] RPC failed:", error);
    throw error;
  }
  const rows = (data ?? []) as { id: string | number }[];
  return rows.map((r) => Number(r.id));
}

export function useMyLotteryBallots(userId: string | undefined) {
  return useQuery({
    queryKey: [...MY_LOTTERY_BALLOTS_QUERY_KEY, userId],
    queryFn: fetchMyBallots,
    enabled: !!userId,
  });
}
