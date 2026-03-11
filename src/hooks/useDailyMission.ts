import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DailyMissionRow {
  user_id: string;
  mission_date: string;
  completed: boolean;
  reward_claimed: boolean;
}

function getTodayDateStr(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

async function fetchTodayMission(userId: string): Promise<DailyMissionRow | null> {
  const today = getTodayDateStr();
  const { data, error } = await supabase
    .from("daily_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", today)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch daily mission", error);
    throw error;
  }

  return data as DailyMissionRow | null;
}

export function useDailyMission(userId: string | undefined) {
  return useQuery({
    queryKey: ["daily_mission", userId, getTodayDateStr()],
    queryFn: () => fetchTodayMission(userId as string),
    enabled: !!userId,
  });
}
