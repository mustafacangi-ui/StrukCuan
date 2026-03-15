import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getISOWeek } from "date-fns";

export const USER_TICKETS_QUERY_KEY = ["user_tickets"] as const;

async function fetchUserTickets(userId: string): Promise<number> {
  const drawWeek = getISOWeek(new Date());
  const { data, error } = await supabase
    .from("user_tickets")
    .select("tickets")
    .eq("user_id", userId)
    .eq("draw_week", drawWeek)
    .maybeSingle();

  if (error) {
    console.error("[useUserTickets] Failed to fetch:", error);
    throw error;
  }
  return data?.tickets ?? 0;
}

export function useUserTickets(userId: string | undefined) {
  return useQuery({
    queryKey: [...USER_TICKETS_QUERY_KEY, userId],
    queryFn: () => fetchUserTickets(userId!),
    enabled: !!userId,
  });
}
