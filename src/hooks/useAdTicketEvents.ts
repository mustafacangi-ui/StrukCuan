import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type EventType = "wednesday" | "sunday";

export const WEDNESDAY_MAX = 3;
export const SUNDAY_MAX = 5;

function getJakartaParts(): { day: number; hour: number; minute: number; second: number; ms: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const now = new Date();
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return {
    day: new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).getDay(),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    ms: now.getMilliseconds(),
  };
}

function getWeekIdFromJakarta(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getCurrentEvent(): {
  active: boolean;
  eventType: EventType | null;
  maxTickets: number;
  startsInMs: number | null;
  endsInMs: number | null;
} {
  const j = getJakartaParts();
  const day = j.day;
  const currentMinutes = j.hour * 60 + j.minute;

  const eventStart = 20 * 60;
  const eventEnd = 21 * 60;

  if (day === 3 && currentMinutes >= eventStart && currentMinutes < eventEnd) {
    const endsIn = (eventEnd - currentMinutes) * 60 * 1000 - (j.second * 1000 + j.ms);
    return {
      active: true,
      eventType: "wednesday",
      maxTickets: WEDNESDAY_MAX,
      startsInMs: null,
      endsInMs: endsIn,
    };
  }
  if (day === 0 && currentMinutes >= eventStart && currentMinutes < eventEnd) {
    const endsIn = (eventEnd - currentMinutes) * 60 * 1000 - (j.second * 1000 + j.ms);
    return {
      active: true,
      eventType: "sunday",
      maxTickets: SUNDAY_MAX,
      startsInMs: null,
      endsInMs: endsIn,
    };
  }

  const now = new Date();
  let nextEvent: Date;
  let nextMax: number;

  if (day < 3) {
    nextEvent = new Date(now);
    nextEvent.setDate(nextEvent.getDate() + (3 - day));
    nextEvent.setHours(20, 0, 0, 0);
    nextMax = WEDNESDAY_MAX;
  } else if (day === 3 && currentMinutes < eventStart) {
    nextEvent = new Date(now);
    nextEvent.setHours(20, 0, 0, 0);
    nextMax = WEDNESDAY_MAX;
  } else if (day === 0 && currentMinutes >= eventEnd) {
    nextEvent = new Date(now);
    nextEvent.setDate(nextEvent.getDate() + 3);
    nextEvent.setHours(20, 0, 0, 0);
    nextMax = WEDNESDAY_MAX;
  } else if (day > 3 && day < 7) {
    nextEvent = new Date(now);
    nextEvent.setDate(nextEvent.getDate() + (7 - day));
    nextEvent.setHours(20, 0, 0, 0);
    nextMax = SUNDAY_MAX;
  } else {
    nextEvent = new Date(now);
    nextEvent.setDate(nextEvent.getDate() + (7 - day + 3));
    nextEvent.setHours(20, 0, 0, 0);
    nextMax = WEDNESDAY_MAX;
  }

  return {
    active: false,
    eventType: null,
    maxTickets: nextMax,
    startsInMs: Math.max(0, nextEvent.getTime() - now.getTime()),
    endsInMs: null,
  };
}

export async function fetchUserAdTicketsThisEvent(
  userId: string,
  eventType: EventType,
  weekId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("ad_ticket_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .eq("week_id", weekId);

  if (error) throw error;
  return count ?? 0;
}

export function useAdTicketEvents(userId: string | undefined) {
  const queryClient = useQueryClient();
  const event = getCurrentEvent();
  const weekId = getWeekIdFromJakarta();

  const query = useQuery({
    queryKey: ["ad_ticket_events", userId, event.eventType ?? "none", weekId],
    queryFn: async () => {
      if (!userId || !event.eventType) return 0;
      return fetchUserAdTicketsThisEvent(userId, event.eventType, weekId);
    },
    enabled: !!userId && !!event.eventType,
  });

  const earnTicket = useMutation({
    mutationFn: async () => {
      if (!userId || !event.eventType || !event.active) throw new Error("Event not active");
      const count = await fetchUserAdTicketsThisEvent(userId, event.eventType, weekId);
      if (count >= event.maxTickets) throw new Error("Max tickets reached");
      const { error } = await supabase.from("ad_ticket_events").insert({
        user_id: userId,
        event_type: event.eventType,
        week_id: weekId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_ticket_events"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });

  return {
    earnedCount: query.data ?? 0,
    isLoading: query.isLoading,
    event,
    weekId,
    earnTicket,
  };
}

export { getWeekIdFromJakarta as getWeekId };
