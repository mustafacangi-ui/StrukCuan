import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface RewardRow {
  id: number;
  country_code: string;
  name: string;
  description: string | null;
  provider: string;
  cuan_cost: number;
  voucher_amount: number;
  image_url: string | null;
}

export const REWARDS_QUERY_KEY = ["rewards"] as const;

async function fetchRewardsByCountry(countryCode: string): Promise<RewardRow[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select("id, country_code, name, description, provider, cuan_cost, voucher_amount, image_url")
    .eq("country_code", countryCode.toUpperCase().slice(0, 2))
    .order("cuan_cost", { ascending: true });

  if (error) {
    console.error("Failed to fetch rewards", error);
    throw error;
  }
  return (data ?? []) as RewardRow[];
}

export function useRewards(countryCode: string | null | undefined) {
  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  return useQuery({
    queryKey: [...REWARDS_QUERY_KEY, code],
    queryFn: () => fetchRewardsByCountry(code),
    enabled: !!code,
  });
}

export interface RedeemResult {
  success: boolean;
  code?: string;
  reward_id?: number;
}

async function redeemReward(rewardId: number): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_CUAN")) throw new Error("INSUFFICIENT_CUAN");
    if (msg.includes("NO_CODES_AVAILABLE")) throw new Error("NO_CODES_AVAILABLE");
    if (msg.includes("not available for your country")) throw new Error("COUNTRY_MISMATCH");
    throw error;
  }

  return (data as RedeemResult) ?? { success: false };
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    },
  });
}
