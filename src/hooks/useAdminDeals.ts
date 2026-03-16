import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DEALS_QUERY_KEY } from "./useDeals";

export interface PendingDeal {
  id: number;
  lat: number;
  lng: number;
  product_name?: string | null;
  price?: number | null;
  store?: string | null;
  image?: string | null;
  status: string;
  discount?: number | null;
  expiry?: string | null;
  is_red_label?: boolean | null;
  user_id?: string | null;
  created_at?: string;
}

async function fetchPendingDeals(): Promise<PendingDeal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch pending deals", error);
    throw error;
  }
  return (data as PendingDeal[]) ?? [];
}

export function usePendingDeals() {
  return useQuery({
    queryKey: [...DEALS_QUERY_KEY, "pending"],
    queryFn: fetchPendingDeals,
  });
}

export function useApproveDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dealId: number) => {
      const { error } = await supabase.rpc("approve_deal", { p_deal_id: dealId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
    },
  });
}

export function useRejectDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dealId: number) => {
      const { error } = await supabase.rpc("reject_deal", { p_deal_id: dealId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
    },
  });
}
