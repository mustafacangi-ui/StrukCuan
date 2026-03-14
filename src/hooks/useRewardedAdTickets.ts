import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const REWARDED_EVENT_TYPE = "rewarded";
const DAILY_MAX = 5;

let rewardInProgress = false;

async function grantTicketSafe(): Promise<void> {
  if (rewardInProgress) return;
  rewardInProgress = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }
    const { error } = await supabase.rpc("grant_ticket");
    if (error) {
      console.error("Reward grant failed", error);
      throw error;
    }
  } finally {
    rewardInProgress = false;
  }
}

function getTodayDateId(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return d.toISOString().slice(0, 10);
}

export async function fetchRewardedAdCountToday(userId: string): Promise<number> {
  const dateId = getTodayDateId();
  const { count, error } = await supabase
    .from("ticket_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export function useRewardedAdTickets(userId: string | undefined) {
  const queryClient = useQueryClient();
  const dateId = getTodayDateId();

  const query = useQuery({
    queryKey: ["rewarded_ad_tickets", userId, dateId],
    queryFn: () => fetchRewardedAdCountToday(userId!),
    enabled: !!userId,
  });

  const earnTicket = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not logged in");
      const count = await fetchRewardedAdCountToday(userId);
      if (count >= DAILY_MAX) throw new Error("Daily limit reached");
      await grantTicketSafe();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["rewarded_ad_tickets", userId, dateId] });
      const prev = queryClient.getQueryData<number>(["rewarded_ad_tickets", userId, dateId]);
      const next = Math.min((prev ?? 0) + 1, DAILY_MAX);
      queryClient.setQueryData(["rewarded_ad_tickets", userId, dateId], next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev != null) {
        queryClient.setQueryData(["rewarded_ad_tickets", userId, dateId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["rewarded_ad_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["monetag_ad_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
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
