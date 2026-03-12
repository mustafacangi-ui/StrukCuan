import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UserStatsRow {
  user_id: string;
  cuan: number;
  tiket: number;
  nickname: string | null;
  total_receipts: number;
  level: number;
  current_streak: number;
  last_upload_date: string | null;
}

async function fetchUserStats(userId: string): Promise<UserStatsRow | null> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id, cuan, tiket, nickname, total_receipts, level, current_streak, last_upload_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user stats", error);
    throw error;
  }

  const row = data as UserStatsRow | null;
  if (row) {
    row.total_receipts = row.total_receipts ?? 0;
    row.level = row.level ?? 1;
    row.current_streak = row.current_streak ?? 0;
  }
  return row ?? null;
}

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_stats", userId],
    queryFn: () => fetchUserStats(userId as string),
    enabled: !!userId,
  });
}

export interface LeaderboardRow {
  user_id: string;
  nickname: string | null;
  total_receipts: number;
  tiket: number;
  level: number;
}

async function fetchLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id, nickname, total_receipts, tiket, level")
    .order("total_receipts", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch leaderboard", error);
    throw error;
  }

  return (data as LeaderboardRow[]) ?? [];
}

export function useLeaderboard(userId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () => fetchLeaderboard(limit),
    enabled: !!userId,
  });
}

