import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const ADMIN_IDS = (import.meta.env.VITE_ADMIN_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

async function fetchIsAdmin(userId: string): Promise<boolean> {
  if (ADMIN_IDS.length > 0 && ADMIN_IDS.includes(userId)) return true;
  const { data, error } = await supabase
    .from("user_stats")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
}

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is_admin", userId],
    queryFn: () => fetchIsAdmin(userId!),
    enabled: !!userId,
  });
}
