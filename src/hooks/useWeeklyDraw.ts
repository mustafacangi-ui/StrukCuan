import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface WeeklyWinner {
  id: number;
  user_id?: string;
  winner_name?: string; // "Mustafa #58964"
  draw_date?: string;
  prize_amount?: number;
  winning_ballot_id?: number | null;
  prize?: string | number; // legacy
  created_at: string;
  [key: string]: unknown;
}

export interface LastDrawBallotRow {
  winning_ballot_id: number | null;
  winner_name?: string | null;
}

/** Total rows in lottery_tickets for current Jakarta week (RPC bypasses per-user RLS). */
async function fetchTotalTicketsThisWeek(): Promise<number> {
  const { data, error } = await supabase.rpc("get_lottery_pool_count");

  if (error) {
    console.error("[useWeeklyDraw] get_lottery_pool_count failed:", error);
    throw error;
  }
  return typeof data === "number" ? data : Number(data ?? 0);
}

async function fetchLastWinner(): Promise<WeeklyWinner | null> {
  const { data, error } = await supabase
    .from("weekly_winners")
    .select("id, user_id, winner_name, draw_date, prize_amount, winning_ballot_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[useWeeklyDraw] Failed to fetch weekly_winners:", error);
    throw error;
  }
  return data as WeeklyWinner | null;
}

/** All winning ballot IDs from the most recent draw_date batch (up to 5 winners). */
async function fetchLastDrawWinningBallots(): Promise<LastDrawBallotRow[]> {
  const { data: latest, error: e1 } = await supabase
    .from("weekly_winners")
    .select("draw_date")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (e1) {
    console.error("[useWeeklyDraw] fetchLastDrawWinningBallots (latest date):", e1);
    throw e1;
  }
  if (!latest?.draw_date) return [];

  const { data, error } = await supabase
    .from("weekly_winners")
    .select("winning_ballot_id, winner_name")
    .eq("draw_date", latest.draw_date)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[useWeeklyDraw] fetchLastDrawWinningBallots:", error);
    throw error;
  }
  return (data ?? []) as LastDrawBallotRow[];
}

export function useTotalTicketsThisWeek() {
  return useQuery({
    queryKey: ["weeklyDraw", "lotteryTicketsCount"],
    queryFn: fetchTotalTicketsThisWeek,
  });
}

export function useLastWinner() {
  return useQuery({
    queryKey: ["weeklyDraw", "lastWinner"],
    queryFn: fetchLastWinner,
  });
}

export function useLastDrawWinningBallots() {
  return useQuery({
    queryKey: ["weeklyDraw", "lastDrawBallots"],
    queryFn: fetchLastDrawWinningBallots,
    staleTime: 60_000,
  });
}
