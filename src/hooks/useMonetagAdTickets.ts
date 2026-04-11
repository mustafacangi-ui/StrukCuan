import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const MONETAG_EVENT_TYPE = "monetag";
const DAILY_MAX = 5;

function getTodayDateId(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return d.toISOString().slice(0, 10);
}

export async function fetchMonetagAdCountToday(userId: string): Promise<number> {
  const dateId = getTodayDateId();
  const { count, error } = await supabase
    .from("ad_ticket_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", MONETAG_EVENT_TYPE)
    .eq("week_id", dateId);

  if (error) throw error;
  return count ?? 0;
}

export function useMonetagAdTickets(userId: string | undefined) {
  const queryClient = useQueryClient();
  const dateId = getTodayDateId();

  const query = useQuery({
    queryKey: ["monetag_ad_tickets", userId, dateId],
    queryFn: () => fetchMonetagAdCountToday(userId!),
    enabled: !!userId,
  });

  const earnTicket = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not logged in");
      const count = await fetchMonetagAdCountToday(userId);
      if (count >= DAILY_MAX) throw new Error("Daily limit reached");
      const { error } = await supabase.from("ad_ticket_events").insert({
        user_id: userId,
        event_type: MONETAG_EVENT_TYPE,
        week_id: dateId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monetag_ad_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });

  return {
    earnedCount: query.data ?? 0,
    isLoading: query.isLoading,
    maxPerDay: DAILY_MAX,
    earnTicket,
    refetch: query.refetch,
  };
}
