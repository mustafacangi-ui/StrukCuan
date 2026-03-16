import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function fetchUserDealsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.warn("[useUserDealsCount] Failed:", error);
    return 0;
  }
  return count ?? 0;
}

export function useUserDealsCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_deals_count", userId],
    queryFn: () => fetchUserDealsCount(userId!),
    enabled: !!userId,
  });
}
