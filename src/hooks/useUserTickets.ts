import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { invalidateTicketQueries } from "@/lib/grantTickets";

console.log('💎 useUserTickets.ts file loaded');

export const USER_TICKETS_QUERY_KEY = ["user_tickets"] as const;

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
    queryKey: [...USER_TICKETS_QUERY_KEY, "weekly_count", userId],
    queryFn: () => fetchWeeklyTicketCount(userId!),
    enabled: !!userId,
  });
}

/**
 * Realtime subscription hook for ticket and survey updates.
 * Automatically invalidates relevant React Query keys to refresh the UI.
 */
export function useTicketsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  // UNIQUE TOP-LEVEL LOG
  console.log('🚀 useTicketsRealtime hook running', userId);

  useEffect(() => {
    console.log('🔄 [useTicketsRealtime] useEffect triggered', { userId });

    if (!userId) {
      console.warn('🟠 [useTicketsRealtime] skipping subscription: userId is null/undefined');
      return;
    }

    console.log('🟢 [useTicketsRealtime] SUBSCRIBING... (No filters version)');

    const channel = supabase
      .channel(`debug-all-rewards-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // ANY EVENT
          schema: "public",
          table: "user_tickets",
        },
        (payload) => {
          console.log("⚡ [Realtime] user_tickets EVENT RECEIVED:", payload);
          if (payload.new && (payload.new as any).user_id === userId) {
            console.log("✅ [Realtime] Match! Invalidating.");
            invalidateTicketQueries(queryClient);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stats",
        },
        (payload) => {
          console.log("⚡ [Realtime] user_stats EVENT RECEIVED:", payload);
          if (payload.new && (payload.new as any).user_id === userId) {
            console.log("✅ [Realtime] Match! Invalidating.");
            invalidateTicketQueries(queryClient);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🌐 [Realtime] Status for ${userId}: ${status.toUpperCase()}`);
      });

    return () => {
      console.log('💀 [useTicketsRealtime] Cleanup - Removing channel');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
