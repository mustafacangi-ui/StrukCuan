import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Daily limit: 10 ads. 5 ads = 1 ticket, 10 ads = 2 tickets. */
const DAILY_MAX_ADS = 10;
const ADS_PER_TICKET = 5;

/** Get today's date (YYYY-MM-DD) in Asia/Jakarta timezone */
function getTodayDateId(): string {
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

/**
 * Get start and end of today in Asia/Jakarta, converted to UTC ISO strings.
 * Supabase stores created_at in UTC, so we must query with UTC bounds.
 *
 * 1. Current date = today in Asia/Jakarta (via getTodayDateId)
 * 2. Start = 00:00:00 Jakarta (+07:00) → toISOString() = UTC
 * 3. End = 23:59:59.999 Jakarta (+07:00) → toISOString() = UTC
 */
function getTodayJakartaBounds(): { start: string; end: string } {
  const dateId = getTodayDateId(); // YYYY-MM-DD in Asia/Jakarta
  const startJakarta = new Date(`${dateId}T00:00:00+07:00`);
  const endJakarta = new Date(`${dateId}T23:59:59.999+07:00`);
  return {
    start: startJakarta.toISOString(),
    end: endJakarta.toISOString(),
  };
}

export type TodayTicket = {
  id: number;
  ticket_number: string | null;
  created_at: string;
};

export async function fetchTodayTickets(userId: string): Promise<TodayTicket[]> {
  const { start, end } = getTodayJakartaBounds();
  const { data, error } = await supabase
    .from("ad_ticket_events")
    .select("id, ticket_number, created_at")
    .eq("user_id", userId)
    .eq("event_type", "rewarded")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

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

  const allEvents = query.data ?? [];
  const adsWatched = allEvents.length;
  const ticketsEarned = Math.floor(adsWatched / ADS_PER_TICKET);

  return {
    tickets: allEvents.filter((t) => t.ticket_number != null),
    ticketsToday: ticketsEarned,
    adsWatched,
    isLoading: query.isLoading,
    maxAds: DAILY_MAX_ADS,
    maxPerDay: Math.floor(DAILY_MAX_ADS / ADS_PER_TICKET),
    refetch: query.refetch,
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: ["today_rewarded_tickets"] });
      await queryClient.refetchQueries({ queryKey: ["today_rewarded_tickets"] });
    },
  };
}
