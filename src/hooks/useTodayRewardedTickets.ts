import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export const TODAY_REWARDED_TICKETS_QUERY_KEY = ["todayRewardedTickets"] as const;

/** Ad reward system: 5 ads = 1 ticket, 10 ads = 2 tickets, 18 ads = 3 tickets. */
export const ADS_PER_TICKET = 5;
export const MAX_ADS_PER_DAY = 18;
export const MAX_TICKETS_PER_DAY = 3;
/** After 10 ads, user watches 3 more (11,12,13) to unlock bonus - these do NOT give tickets. */
export const BONUS_UNLOCK_ADS = 3;
export const FIRST_TICKET_AT = 5;
export const SECOND_TICKET_AT = 10;
export const BONUS_UNLOCK_AT = 10;
export const THIRD_TICKET_AT = 18;

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

/**
 * Fetch today's ad_ticket_events only (rewarded ads watched today).
 * Uses week_id = today's date (matches backend grant_ticket daily limit).
 * Do NOT use for ticket count - use user_tickets.tickets for that.
 */
export async function fetchTodayAdEvents(userId: string): Promise<TodayTicket[]> {
  const todayId = getTodayDateId();
  const { data, error } = await supabase
    .from("ad_ticket_events")
    .select("id, ticket_number, created_at")
    .eq("user_id", userId)
    .eq("event_type", "rewarded")
    .eq("week_id", todayId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[useTodayRewardedTickets] Fetch error:", {
      message: error.message,
      code: error.code,
      userId,
    });
    throw error;
  }
  return (data ?? []) as TodayTicket[];
}

/** Get progress segment for UI: X/5, NEXT TICKET AT Y ADS */
export function getAdProgressSegment(adsWatched: number, bonusUnlocked: boolean): {
  segmentProgress: number;
  segmentTarget: number;
  nextTicketAt: number | null;
  phase: "first" | "second" | "bonus_modal" | "bonus_unlock" | "third" | "final";
} {
  if (adsWatched < FIRST_TICKET_AT) {
    return { segmentProgress: adsWatched, segmentTarget: ADS_PER_TICKET, nextTicketAt: FIRST_TICKET_AT, phase: "first" };
  }
  if (adsWatched < SECOND_TICKET_AT) {
    return { segmentProgress: adsWatched - FIRST_TICKET_AT, segmentTarget: ADS_PER_TICKET, nextTicketAt: SECOND_TICKET_AT, phase: "second" };
  }
  if (adsWatched === SECOND_TICKET_AT && !bonusUnlocked) {
    return { segmentProgress: 5, segmentTarget: ADS_PER_TICKET, nextTicketAt: null, phase: "bonus_modal" };
  }
  if (adsWatched >= SECOND_TICKET_AT && adsWatched < SECOND_TICKET_AT + BONUS_UNLOCK_ADS) {
    return { segmentProgress: adsWatched - SECOND_TICKET_AT, segmentTarget: BONUS_UNLOCK_ADS, nextTicketAt: null, phase: "bonus_unlock" };
  }
  if (adsWatched < THIRD_TICKET_AT) {
    const progress = adsWatched - (SECOND_TICKET_AT + BONUS_UNLOCK_ADS);
    return { segmentProgress: progress, segmentTarget: ADS_PER_TICKET, nextTicketAt: THIRD_TICKET_AT, phase: "third" };
  }
  return { segmentProgress: ADS_PER_TICKET, segmentTarget: ADS_PER_TICKET, nextTicketAt: null, phase: "final" };
}

/**
 * Ads watched today only (from ad_ticket_events).
 * Ticket count for the week must come from useUserTickets (user_tickets.tickets).
 */
export function useTodayRewardedTickets() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const query = useQuery({
    queryKey: [...TODAY_REWARDED_TICKETS_QUERY_KEY, user?.id, getTodayDateId()],
    queryFn: () => fetchTodayAdEvents(user!.id),
    enabled: !!user,
  });

  const adsWatchedToday = query.data?.length ?? 0;

  return {
    /** Ads watched today (for daily limit progress bar). From ad_ticket_events. */
    adsWatched: adsWatchedToday,
    /** Today's ad events for display (e.g. "My Tickets Today" list). */
    tickets: query.data ?? [],
    isLoading: query.isLoading,
    maxAds: MAX_ADS_PER_DAY,
    maxPerDay: MAX_ADS_PER_DAY,
    refetch: query.refetch,
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
    },
  };
}
