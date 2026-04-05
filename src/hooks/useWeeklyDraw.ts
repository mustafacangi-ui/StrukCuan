import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export interface WeeklyWinner {
  id: number;
  user_id?: string;
  winner_name?: string;
  draw_date?: string;
  prize_amount?: number;
  voucher_amount?: number;
  winning_ballot_id?: number | null;
  draw_code?: string | null;
  week_key?: string | null;
  prize?: string | number;
  created_at: string;
  [key: string]: unknown;
}

export interface DrawEntry {
  draw_code: string;
  ticket_threshold: number;
  week_key: string;
  created_at: string;
}

/** Total rows in lottery_tickets for current Jakarta week */
async function fetchTotalTicketsThisWeek(): Promise<number> {
  const { data, error } = await supabase.rpc("get_lottery_pool_count");
  if (error) {
    console.error("[useWeeklyDraw] get_lottery_pool_count failed:", error);
    return 0;
  }
  return typeof data === "number" ? data : Number(data ?? 0);
}

async function fetchLastWinners(): Promise<WeeklyWinner[]> {
  const { data, error } = await supabase
    .from("weekly_winners")
    .select("id, user_id, winner_name, draw_date, prize_amount, voucher_amount, winning_ballot_id, draw_code, week_key, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[useWeeklyDraw] Failed to fetch weekly_winners:", error);
    return [];
  }
  return (data ?? []) as WeeklyWinner[];
}

/** User's own draw entries for the current week */
async function fetchMyDrawEntries(): Promise<DrawEntry[]> {
  const { data, error } = await supabase.rpc("get_my_draw_entries");
  if (error) {
    console.error("[useWeeklyDraw] get_my_draw_entries failed:", error);
    return [];
  }
  return (data ?? []) as DrawEntry[];
}

/** Ensure draw entries are minted for current ticket count */
async function ensureDrawEntries(userId: string): Promise<{ new_entries: number }> {
  const { data, error } = await supabase.rpc("ensure_draw_entries", { p_user_id: userId });
  if (error) {
    console.error("[useWeeklyDraw] ensure_draw_entries failed:", error);
    return { new_entries: 0 };
  }
  return (data as { new_entries: number }) ?? { new_entries: 0 };
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
    queryFn: async () => {
      const winners = await fetchLastWinners();
      return winners[0] ?? null;
    },
  });
}

export function useLastDrawWinningBallots() {
  return useQuery({
    queryKey: ["weeklyDraw", "lastDrawBallots"],
    queryFn: async () => {
      const { data: latest } = await supabase
        .from("weekly_winners")
        .select("draw_date")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest?.draw_date) return [];
      const { data } = await supabase
        .from("weekly_winners")
        .select("winning_ballot_id, winner_name")
        .eq("draw_date", latest.draw_date)
        .order("created_at", { ascending: true });
      return (data ?? []) as { winning_ballot_id: number | null; winner_name?: string | null }[];
    },
    staleTime: 60_000,
  });
}

export function useAllWinners() {
  return useQuery({
    queryKey: ["weeklyDraw", "allWinners"],
    queryFn: fetchLastWinners,
    staleTime: 60_000,
  });
}

export function useMyDrawEntries() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["weeklyDraw", "myEntries", user?.id],
    queryFn: fetchMyDrawEntries,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useEnsureDrawEntries() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return { new_entries: 0 };
      return ensureDrawEntries(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyDraw", "myEntries"] });
    },
  });
}
