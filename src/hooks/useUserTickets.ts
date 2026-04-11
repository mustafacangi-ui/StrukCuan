import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { invalidateTicketQueries } from "@/lib/grantTickets";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";
import { USER_STATS_QUERY_KEY } from "@/hooks/useUserStats";

export const USER_TICKETS_QUERY_KEY = ["user_tickets"] as const;

/** Weekly draw ticket count (current week row in `user_tickets`). */
export const WEEKLY_TICKET_COUNT_QUERY_KEY = ["weeklyTicketCount"] as const;

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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch tickets earned THIS WEEK from user_tickets table (capped for draw)
 */
async function fetchWeeklyTicketCount(userId: string): Promise<number> {
  // Get current Jakarta date/time for week calculation
  const now = new Date();
  const jktString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const jktDate = new Date(jktString);
  
  // Calculate ISO week number (approximate to match Postgres extract(week))
  const startOfYear = new Date(jktDate.getFullYear(), 0, 1);
  const days = Math.floor((jktDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7);

  const { data, error } = await supabase
    .from("user_tickets")
    .select("tickets, draw_week")
    .eq("user_id", userId)
    .eq("draw_week", currentWeek) // Explicitly filter for current week
    .maybeSingle();

  if (error) {
    console.error("[useWeeklyTicketCount] Error:", error);
    return 0;
  }

  return data?.tickets ?? 0;
}


export function useWeeklyTicketCount(userId: string | undefined) {
  return useQuery({
    queryKey: [...WEEKLY_TICKET_COUNT_QUERY_KEY, userId],
    queryFn: () => fetchWeeklyTicketCount(userId!),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Realtime subscription hook for ticket and survey updates.
 * Updates caches from payloads, then invalidates/refetches for consistency.
 */
export function useTicketsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    if (!userId) return;

    const filter = `user_id=eq.${userId}`;

    const flushTicketsAndBallots = async () => {
      await invalidateTicketQueries(queryClient);
      await invalidateLotteryPoolQueries(queryClient);
    };

    const channel = supabase
      .channel(`tickets-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_tickets",
          filter,
        },
        async (payload) => {
          console.log("realtime payload received", {
            table: "user_tickets",
            event: payload.eventType,
          });
          const row = payload.new as { tickets?: number } | null;
          if (row && typeof row.tickets === "number") {
            queryClient.setQueryData(
              [...WEEKLY_TICKET_COUNT_QUERY_KEY, userId],
              row.tickets
            );
            console.log("realtime cache updated", {
              key: [...WEEKLY_TICKET_COUNT_QUERY_KEY, userId],
            });
          }
          await flushTicketsAndBallots();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stats",
          filter,
        },
        async (payload) => {
          console.log("realtime payload received", {
            table: "user_stats",
            event: payload.eventType,
          });
          if (payload.new) {
            const row = payload.new as Record<string, unknown>;
            queryClient.setQueryData(
              [...USER_STATS_QUERY_KEY, userId],
              (old: any) => ({
                ...old,
                ...row,
                user_id: userId,
                ticket: row.ticket ?? old?.ticket,
                tickets: row.tickets ?? old?.tickets,
                total_tickets: row.total_tickets ?? old?.total_tickets,
                weekly_tickets: row.weekly_tickets ?? old?.weekly_tickets,
                tiket:
                  (typeof row.tiket === "number" ? row.tiket : undefined) ??
                  (typeof row.ticket === "number" ? row.ticket : undefined) ??
                  old?.tiket ??
                  0,
              })
            );
            console.log("realtime cache updated", {
              key: [...USER_STATS_QUERY_KEY, userId],
            });
          }
          await invalidateTicketQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survey_events",
          filter,
        },
        async (payload) => {
          console.log("realtime payload received", {
            table: "survey_events",
            event: payload.eventType,
          });
          await invalidateTicketQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "survey_rewards",
          filter,
        },
        async (payload) => {
          console.log("realtime payload received", {
            table: "survey_rewards",
            event: payload.eventType,
          });
          const { status, tickets_granted } = payload.new as {
            status: string;
            tickets_granted: number;
          };
          if (status === "completed") {
            toast.success(t("earn.survey.completed"), {
              description: t("earn.survey.ticketsEarned", { n: tickets_granted }),
            });
            await queryClient.invalidateQueries({
              queryKey: USER_TICKETS_QUERY_KEY,
            });
            await invalidateTicketQueries(queryClient);
            await invalidateLotteryPoolQueries(queryClient);
            console.log("realtime cache updated", {
              table: "survey_rewards",
              action: "invalidate",
            });
          } else if (
            status === "reversed" ||
            status === "rejected" ||
            status === "screenout" ||
            status === "quota_full"
          ) {
            const reason = status.replace(/_/g, " ");
            toast.error(t("earn.survey.rejected"), {
              description: `Outcome: ${reason}. No tickets granted.`,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("realtime subscribed");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, t]);
}
