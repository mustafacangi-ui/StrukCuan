import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const REWARDED_EVENT_TYPE = "rewarded";
const DAILY_MAX = 5;

function getTodayDateId(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return d.toISOString().slice(0, 10);
}

export type TodayTicket = {
  id: number;
  ticket_number: string | null;
  created_at: string;
};

export async function fetchTodayTickets(userId: string): Promise<TodayTicket[]> {
  const dateId = getTodayDateId();
  const { data, error } = await supabase
    .from("ad_ticket_events")
    .select("id, ticket_number, created_at")
    .eq("user_id", userId)
    .eq("event_type", REWARDED_EVENT_TYPE)
    .eq("week_id", dateId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TodayTicket[];
}

export function useTodayRewardedTickets(userId: string | undefined) {
  const queryClient = useQueryClient();
  const dateId = getTodayDateId();

  const query = useQuery({
    queryKey: ["today_rewarded_tickets", userId, dateId],
    queryFn: () => fetchTodayTickets(userId!),
    enabled: !!userId,
  });

  return {
    tickets: query.data ?? [],
    ticketsToday: (query.data ?? []).length,
    isLoading: query.isLoading,
    maxPerDay: DAILY_MAX,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["today_rewarded_tickets"] }),
  };
}
