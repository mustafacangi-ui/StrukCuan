import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UserStatsRow {
  user_id: string;
  cuan: number;
  tiket: number;
  nickname: string | null;
}

async function fetchUserStats(userId: string): Promise<UserStatsRow | null> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id, cuan, tiket, nickname")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user stats", error);
    throw error;
  }

  return (data as UserStatsRow) ?? null;
}

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_stats", userId],
    queryFn: () => fetchUserStats(userId as string),
    enabled: !!userId,
  });
}

