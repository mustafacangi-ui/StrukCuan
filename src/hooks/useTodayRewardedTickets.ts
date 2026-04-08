import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getISOWeek } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export const TODAY_REWARDED_TICKETS_QUERY_KEY = ["todayRewardedTickets"] as const;

/** Ad reward system: 1 ad = 1 ticket. Max 10 ads/day. */
export const ADS_PER_TICKET = 1;
export const MAX_ADS_PER_DAY = 10;
export const MAX_TICKETS_PER_DAY = 10;
/** Legacy aliases kept for backward compat */
export const FIRST_TICKET_AT = 1;
export const SECOND_TICKET_AT = 2;
export const THIRD_TICKET_AT = 3;
export const BONUS_UNLOCK_ADS = 0;
export const BONUS_UNLOCK_AT = 0;

/** Each ad = 1 ticket directly. */
export function ticketsFromAds(adsWatched: number): number {
  return Math.min(Number(adsWatched) || 0, MAX_ADS_PER_DAY);
}

/** No threshold system — every ad gives a ticket. */
export function getNextTicketAt(_adsWatched: number): number | null {
  return null;
}

/** Start of today in Asia/Jakarta as ISO string, for filtering ad_ticket_events by created_at. */
export function getTodayStartISO(): string {
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return `${dateStr}T00:00:00+07:00`;
}

/** ISO week number in Asia/Jakarta (matches grant_ticket draw_week). */
export function getDrawWeekJakarta(): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "0", 10);
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "0", 10);
  const d = new Date(year, month - 1, day);
  return getISOWeek(d);
}

/** Get week_id in ISO week format (YYYY-WW) for ad_ticket_events. Uses Asia/Jakarta timezone. */
export function getTodayDateId(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "0", 10);
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "0", 10);
  const d = new Date(year, month - 1, day);
  const week = getISOWeek(d);
  return `${year}-${String(week).padStart(2, "0")}`;
}

export type TodayTicket = {
  id: number;
  ticket_number: string | null;
  created_at: string;
};

/**
 * Fetch today's rewarded ad count via RPC (bypasses RLS, uses same date logic as grant_ticket).
 * Returns count from ad_ticket_events where event_type='rewarded' and created_at >= start of today (Asia/Jakarta).
 */
export async function fetchTodayRewardedCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_today_rewarded_count");
  if (error) {
    console.error("[useTodayRewardedTickets] Fetch count error:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
  const count = typeof data === "number" ? data : 0;
  if (!import.meta.env.PROD) {
    console.log("[useTodayRewardedTickets] get_today_rewarded_count RPC returned:", count);
  }
  return count;
}

/**
 * Fetch ad_ticket_events for today (fallback for tickets array).
 * Uses table query - may be blocked by RLS if policy missing.
 */
export async function fetchTodayAdEvents(userId: string): Promise<TodayTicket[]> {
  const todayStart = getTodayStartISO();
  const { data, error } = await supabase
    .from("ad_ticket_events")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("event_type", "rewarded")
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[useTodayRewardedTickets] Fetch events error:", {
      message: error.message,
      code: error.code,
      userId,
    });
    return [];
  }
  return (data ?? []) as TodayTicket[];
}

/** Get progress segment for UI: X/10, 1 ad = 1 ticket */
export function getAdProgressSegment(adsWatched: number, _bonusUnlocked: boolean): {
  segmentProgress: number;
  segmentTarget: number;
  nextTicketAt: number | null;
  phase: "first" | "second" | "bonus_modal" | "bonus_unlock" | "third" | "final";
} {
  const n = Math.min(Number(adsWatched) || 0, MAX_ADS_PER_DAY);
  if (n >= MAX_ADS_PER_DAY) {
    return { segmentProgress: MAX_ADS_PER_DAY, segmentTarget: MAX_ADS_PER_DAY, nextTicketAt: null, phase: "final" };
  }
  return { segmentProgress: n, segmentTarget: MAX_ADS_PER_DAY, nextTicketAt: n + 1, phase: "first" };
}

/**
 * Ads watched today only (from ad_ticket_events via get_today_rewarded_count RPC).
 * Uses RPC to bypass RLS and ensure same date logic as grant_ticket (Asia/Jakarta).
 * Ticket count for the week must come from useUserTickets (user_tickets.tickets).
 */
export function useTodayRewardedTickets() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const countQuery = useQuery({
    queryKey: [...TODAY_REWARDED_TICKETS_QUERY_KEY, user?.id, "count", getTodayStartISO().slice(0, 10)],
    queryFn: () => fetchTodayRewardedCount(),
    enabled: !!user,
  });

  const eventsQuery = useQuery({
    queryKey: [...TODAY_REWARDED_TICKETS_QUERY_KEY, user?.id, "events", getTodayStartISO().slice(0, 10)],
    queryFn: () => fetchTodayAdEvents(user!.id),
    enabled: !!user,
  });

  const adsWatchedToday = countQuery.data ?? 0;

  const refetch = useCallback(async () => {
    await Promise.all([countQuery.refetch(), eventsQuery.refetch()]);
  }, [countQuery.refetch, eventsQuery.refetch]);

  return {
    /** Count of ad_ticket_events (event_type='rewarded') today. Each row = 1 ad, NOT 1 ticket. */
    adsWatched: adsWatchedToday,
    /** Tickets derived from adsWatched thresholds: 5→1, 10→1, 17→1. For display only; actual tickets in user_tickets. */
    ticketsFromAdsToday: ticketsFromAds(adsWatchedToday),
    /** Raw ad events - do NOT treat as tickets. Use for latest event display only. */
    tickets: eventsQuery.data ?? [],
    isLoading: countQuery.isLoading,
    maxAds: MAX_ADS_PER_DAY,
    maxPerDay: MAX_ADS_PER_DAY,
    refetch,
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
    },
  };
}
