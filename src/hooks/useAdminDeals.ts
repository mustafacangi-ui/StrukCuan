import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { DEALS_QUERY_KEY } from "./useDeals";
import { grantTickets, invalidateTicketQueries } from "@/lib/grantTickets";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";

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
      console.log('[DealApprove] start', { dealId });

      const { data: existingDeal, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle();

      if (fetchError || !existingDeal) {
        const err = fetchError || new Error(`Deal not found: ${dealId}`);
        console.log('[DealApprove] reward error', err);
        throw err;
      }

      // Determine reward amount
      const rewardAmount = existingDeal.is_red_label ? 3 : 1;

      // Step 1: Grant tickets FIRST — if this fails, deal stays pending
      if (existingDeal.user_id) {
        try {
          await grantTickets(existingDeal.user_id, rewardAmount);
          console.log('[DealApprove] reward success');
        } catch (error) {
          console.log('[DealApprove] reward error', error);
          throw error;
        }
      }

      // Step 2: Only THEN update deal status
      const { data, error } = await supabase
        .from('deals')
        .update({
          status: 'active'
        })
        .eq('id', dealId)
        .select();

      if (error || !data || data.length === 0) {
        const err = error || new Error('No rows updated. RLS block or deal missing.');
        console.log('[DealApprove] reward error', err);
        throw err;
      }

      console.log('[DealApprove] Successfully approved deal:', dealId);
    },
    onSuccess: () => {
      console.log('[DealApprove] Invalidate queries');
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...DEALS_QUERY_KEY, 'pending'] });
      invalidateTicketQueries(queryClient);
      invalidateLotteryPoolQueries(queryClient);
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
