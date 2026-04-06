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
      console.log('[DealApprove] start', dealId);
      console.log('[DealApprove] Current admin user:', user?.id);

      const { data: existingDeal, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle()

      console.log('[DealApprove] Existing deal:', existingDeal);
      if (fetchError) console.error('[DealApprove] Fetch error:', fetchError);

      if (!existingDeal) {
        throw new Error(`Deal not found: ${dealId}`);
      }

      // Determine reward amount
      const rewardAmount = existingDeal.is_red_label ? 3 : 1;
      console.log('[DealApprove] reward amount', rewardAmount);

      // Step 1: Grant tickets FIRST — if this fails, deal stays pending
      if (existingDeal.user_id) {
        console.log('[DealApprove] profile before — granting', rewardAmount, 'tickets to', existingDeal.user_id);
        await grantTickets(existingDeal.user_id, rewardAmount);
        console.log('[DealApprove] profile after — tickets granted successfully');
        console.log('[DealApprove] update success');
      }

      // Step 2: Only THEN update deal status (so it doesn't disappear before tickets are granted)
      const { data, error } = await supabase
        .from('deals')
        .update({
          status: 'active'
        })
        .eq('id', dealId)
        .select();

      if (error) {
        console.error('[DealApprove] update error', error);
        console.error('[DealApprove] Failed to approve deal. Full error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        const msg = 'No rows updated. RLS block or deal missing.';
        console.error('[DealApprove] update error', msg, 'ID:', dealId);
        throw new Error(msg);
      }

      console.log('[DealApprove] Successfully approved deal:', dealId, 'Result Data:', data);
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
