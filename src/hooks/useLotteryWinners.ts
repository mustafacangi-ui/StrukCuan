import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LotteryWinnerRow {
  id: number;
  draw_date: string;
  winner_user_id: string;
  tickets_used: number;
  reward_amount: number;
  nickname?: string;
}

async function fetchRecentWinners(limit = 10, countryCode?: string | null): Promise<LotteryWinnerRow[]> {
  let q = supabase
    .from("weekly_lottery")
    .select("id, draw_date, winner_user_id, tickets_used, reward_amount")
    .order("draw_date", { ascending: false })
    .limit(limit * 2);

  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  q = q.eq("country_code", code);

  const { data: lotteryData, error } = await q;

  if (error) {
    console.error("Failed to fetch lottery winners", error);
    throw error;
  }

  if (!lotteryData?.length) return [];

  const userIds = [...new Set((lotteryData as LotteryWinnerRow[]).map((w) => w.winner_user_id))];
  const { data: statsData } = await supabase
    .from("user_stats")
    .select("user_id, nickname")
    .in("user_id", userIds);

  const nicknames = new Map(
    (statsData ?? []).map((s: { user_id: string; nickname: string | null }) => [
      s.user_id,
      s.nickname || "Anonim",
    ])
  );

  return (lotteryData as LotteryWinnerRow[]).slice(0, limit).map((w) => ({
    ...w,
    nickname: nicknames.get(w.winner_user_id) ?? "Anonim",
  }));
}

export function useLotteryWinners(limit = 10, countryCode?: string | null) {
  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  return useQuery({
    queryKey: ["lottery_winners", limit, code],
    queryFn: () => fetchRecentWinners(limit, code),
  });
}
