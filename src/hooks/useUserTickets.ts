import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getDrawWeekJakarta } from "@/hooks/useTodayRewardedTickets";

export const USER_TICKETS_QUERY_KEY = ["user_tickets"] as const;

/**
 * Fetch total cumulative tickets from user_stats.tiket
 * Represents the universal ticket balance for everything (ads, receipts, shakes, etc.)
 */
async function fetchUserTickets(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("tiket")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[useUserTickets] Failed to fetch:", error);
    throw error;
  }
  return data?.tiket ?? 0;
}

export function useUserTickets(userId: string | undefined) {
  return useQuery({
    queryKey: [...USER_TICKETS_QUERY_KEY, "total_cumulative", userId],
    queryFn: () => fetchUserTickets(userId!),
    enabled: !!userId,
  });
}
