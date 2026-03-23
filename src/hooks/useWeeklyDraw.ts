import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getISOWeek } from "date-fns";

export interface WeeklyWinner {
  id: number;
  user_id?: string;
  winner_name?: string;  // "Mustafa #58964"
  draw_date?: string;
  prize_amount?: number;
  prize?: string | number; // legacy
  created_at: string;
  [key: string]: unknown;
}

async function fetchTotalTicketsThisWeek(): Promise<number> {
  const weekNum = getISOWeek(new Date());
  const { count, error } = await supabase
    .from("lottery_tickets")
    .select("*", { count: "exact", head: true })
    .eq("draw_week", weekNum);

  if (error) {
    console.error("[useWeeklyDraw] Failed to fetch lottery_tickets count:", error);
    throw error;
  }
  return count ?? 0;
}

async function fetchLastWinner(): Promise<WeeklyWinner | null> {
  const { data, error } = await supabase
    .from("weekly_winners")
    .select("id, user_id, winner_name, draw_date, prize_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[useWeeklyDraw] Failed to fetch weekly_winners:", error);
    throw error;
  }
  return data as WeeklyWinner | null;
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
