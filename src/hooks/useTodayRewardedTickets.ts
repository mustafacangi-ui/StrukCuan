import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export const TODAY_REWARDED_TICKETS_QUERY_KEY = ["todayRewardedTickets"] as const;

/** Daily limit: 3 ads. 1 ad = 1 ticket. */
const DAILY_MAX_ADS = 3;

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
  const { data, error } = await supabase
    .from("ad_ticket_events")
    .select("*")
    .eq("user_id", userId)
    .eq("event_type", "rewarded")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[useTodayRewardedTickets] Fetch error:", {
      message: error.message,
      code: error.code,
      userId,
    });
    throw error;
  }
  const rows = (data ?? []) as TodayTicket[];
  console.log("[useTodayRewardedTickets] Fetched ad_ticket_events:", {
    userId,
    rowCount: rows.length,
    rows,
  });
  return rows;
}

export function useTodayRewardedTickets() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const query = useQuery({
    queryKey: [...TODAY_REWARDED_TICKETS_QUERY_KEY, user?.id],
    queryFn: () => fetchTodayTickets(user!.id),
    enabled: !!user,
  });

  const adsWatched = query.data?.length ?? 0;

  return {
    adsWatched,
    ticketsToday: adsWatched,
    tickets: query.data ?? [],
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
