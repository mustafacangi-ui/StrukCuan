import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://struk-cuan.vercel.app";

export const WHATSAPP_MESSAGE = (referralCode: string) =>
  `Aku lagi kumpulin tiket di StrukCuan 🎟️
Upload struk belanja dan menangkan voucher Rp100.000 setiap minggu.

Daftar pakai link aku dan dapat tiket gratis!

👉 ${BASE_URL}?r=${referralCode}`;

export function useReferralCode(userId: string | undefined) {
  return useQuery({
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
