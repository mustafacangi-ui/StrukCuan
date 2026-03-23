import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LotteryWinnerRow {
  id: number;
  user_id: string;
  winner_name: string; // "Mustafa #58964" – stored by run_weekly_draw
  draw_date: string;
  prize_amount: number;
  winning_ballot_id?: number | null;
}

async function fetchRecentWinners(limit = 10): Promise<LotteryWinnerRow[]> {
  const { data, error } = await supabase
    .from("weekly_winners")
    .select("id, user_id, winner_name, draw_date, prize_amount, winning_ballot_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[useLotteryWinners] Failed to fetch weekly_winners:", error);
    throw error;
  }

  return (data ?? []) as LotteryWinnerRow[];
}

export function useLotteryWinners(limit = 10, _countryCode?: string | null) {
  return useQuery({
    queryKey: ["lottery_winners", limit],
    queryFn: () => fetchRecentWinners(limit),
  });
}
