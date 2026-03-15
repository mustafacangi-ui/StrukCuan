import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getDrawWeekJakarta } from "@/hooks/useTodayRewardedTickets";

export const USER_TICKETS_QUERY_KEY = ["user_tickets"] as const;

/**
 * Fetch user_tickets for current week (Asia/Jakarta).
 * Must match grant_ticket draw_week for ticket count to display correctly.
 */
async function fetchUserTickets(userId: string): Promise<number> {
  const drawWeek = getDrawWeekJakarta();
  const { data, error } = await supabase
    .from("user_tickets")
    .select("tickets")
    .eq("user_id", userId)
    .eq("draw_week", drawWeek)
    .maybeSingle();

  if (error) {
    console.error("[useUserTickets] Failed to fetch:", error);
    throw error;
  }
  return data?.tickets ?? 0;
}

export function useUserTickets(userId: string | undefined) {
  const drawWeek = getDrawWeekJakarta();
  return useQuery({
    queryKey: [...USER_TICKETS_QUERY_KEY, userId, drawWeek],
    queryFn: () => fetchUserTickets(userId!),
    enabled: !!userId,
  });
}
