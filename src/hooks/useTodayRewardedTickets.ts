import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const TODAY_REWARDED_TICKETS_QUERY_KEY = ["todayRewardedTickets"] as const;

/** Daily limit: 10 ads. 1 ad = 1 ticket. */
const DAILY_MAX_ADS = 10;

/** Get today's date (YYYY-MM-DD) in Asia/Jakarta timezone */
export function getTodayDateId(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
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
    .eq("event_type", "rewarded")
    .eq("week_id", dateId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TodayTicket[];
}

export function useTodayRewardedTickets(userId: string | undefined) {
  const queryClient = useQueryClient();
  const dateId = getTodayDateId();

  const query = useQuery({
    queryKey: [...TODAY_REWARDED_TICKETS_QUERY_KEY, userId, dateId],
    queryFn: () => fetchTodayTickets(userId!),
    enabled: !!userId,
  });

  const allEvents = query.data ?? [];
  const adsWatched = allEvents.length;

  console.log("AD EVENTS:", query.data);
  console.log("ADS WATCHED:", adsWatched);

  return {
    adsWatched,
    ticketsToday: Math.floor(adsWatched / 5),
    tickets: allEvents,
    isLoading: query.isLoading,
    maxAds: DAILY_MAX_ADS,
    maxPerDay: DAILY_MAX_ADS,
    refetch: query.refetch,
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
    },
  };
}
