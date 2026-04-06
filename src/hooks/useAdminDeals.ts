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
  ticket_reward?: number | null;
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
    mutationFn: async ({ dealId, ticketReward }: { dealId: number | string; ticketReward?: number }) => {
      console.log('[AdminDealApprove] start', { dealId });

      const { data: deal, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle();

      if (fetchError || !deal) {
        throw fetchError || new Error(`Deal not found: ${dealId}`);
      }

      // 1. Determine reward amount (Selection || Row value || Default 3)
      const rewardAmount = ticketReward || deal.ticket_reward || 3;

      console.log('[AdminDealApprove] rewardAmount', rewardAmount);
      console.log('[AdminDealApprove] userId', deal.user_id);

      try {
        // 2. Update the deal first
        const { error: dealError } = await supabase
          .from('deals')
          .update({
            status: 'active',
            ticket_reward: rewardAmount
          })
          .eq('id', dealId);

        if (dealError) throw dealError;

        // 3. Then grant the reward
        if (deal.user_id) {
          try {
            console.log('[AdminDealApprove] before grantTickets');
            const grantResult = await grantTickets(deal.user_id, rewardAmount);
            console.log('[AdminDealApprove] grantResult', grantResult);
            console.log('[AdminDealApprove] after grantTickets');
            console.log('[AdminDealApprove] grant success');
          } catch (error) {
            console.log('[AdminDealApprove] grant error', error);
            
            // REVERT: If grant fails, put back to pending so admin can retry
            await supabase
              .from('deals')
              .update({ status: 'pending' })
              .eq('id', dealId);

            throw error;
          }
        }
      } catch (err: any) {
        console.error('[AdminDealApprove] Fatal error', err);
        throw err;
      }
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
