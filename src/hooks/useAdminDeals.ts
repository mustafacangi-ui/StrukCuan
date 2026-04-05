import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { DEALS_QUERY_KEY } from "./useDeals";

export interface PendingDeal {
  id: number | string;
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
  const { user } = useUser();
  return useMutation({
    mutationFn: async (dealId: number | string) => {
      console.log('[useApproveDeal] Starting approval for deal:', dealId);
      console.log('[useApproveDeal] Current user:', user?.id);
      const { data, error } = await supabase
        .from('deals')
        .update({
          status: 'active'
        })
        .eq('id', dealId)
        .select();

      if (error) {
        console.error('[useApproveDeal] Failed to approve deal. Full error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[useApproveDeal] No rows were updated. RLS policy might be blocking the update, or ID not found. ID:', dealId);
        throw new Error('No rows updated. RLS block or deal missing.');
      }

      console.log('[useApproveDeal] Successfully approved deal:', dealId, 'Result Data:', data);
    },
    onSuccess: () => {
      console.log('[useApproveDeal] Invalidate queries');
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...DEALS_QUERY_KEY, 'pending'] });
    },
  });
}

export function useRejectDeal() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  return useMutation({
    mutationFn: async (dealId: number | string) => {
      const { error } = await supabase
        .from('deals')
        .update({
          status: 'rejected'
        })
        .eq('id', dealId);
      if (error) {
        console.error('Failed to reject deal:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...DEALS_QUERY_KEY, 'pending'] });
    },
  });
}
