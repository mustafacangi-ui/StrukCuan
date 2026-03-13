import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const WHATSAPP_MESSAGE = (referralUrl: string) =>
  `Aku lagi kumpulin tiket di StrukCuan 🎟️
Upload struk belanja dan menangkan voucher Rp100.000 setiap minggu.

Daftar pakai link aku dan dapat tiket gratis!

👉 ${referralUrl}`;

export function useReferralCode(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["referral_code", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return (data?.referral_code as string) ?? null;
    },
    enabled: !!userId,
  });

  const ensureReferralCode = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("referral_code")
        .single();
      if (error) throw error;
      return data?.referral_code as string | null;
    },
    onSuccess: (code) => {
      if (code) {
        queryClient.setQueryData(["referral_code", userId], code);
      } else {
        queryClient.invalidateQueries({ queryKey: ["referral_code", userId] });
      }
    },
  });

  return {
    ...query,
    ensureReferralCode: () => ensureReferralCode.mutateAsync(),
  };
}

export function useReferralCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["referral_count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_user_id", userId)
        .eq("reward_given", true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}
