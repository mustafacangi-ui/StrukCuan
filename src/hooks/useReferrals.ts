import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const WHATSAPP_MESSAGE = (referralUrl: string) =>
  `Aku lagi kumpulin tiket di StrukCuan 🎟️
Upload struk belanja dan menangkan voucher Rp100.000 setiap minggu.

Daftar pakai link aku dan dapat tiket gratis!

👉 ${referralUrl}`;

/** Generate a fallback referral code from user id (6-char uppercase) */
function generateFallbackCode(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function useReferralCode(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["referral_code", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const code = (data?.referral_code as string)?.trim() || null;
      return code;
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 60_000,
  });

  const ensureReferralCode = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!userId) throw new Error("No user");
      const fallback = generateFallbackCode(userId);
      const { data, error } = await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("referral_code")
        .single();
      if (!error && data?.referral_code) {
        return data.referral_code as string;
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ referral_code: fallback, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (!updateError) return fallback;
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, referral_code: fallback, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
      return upsertError ? fallback : fallback;
    },
    onSuccess: (code) => {
      queryClient.setQueryData(["referral_code", userId], code);
    },
  });

  return {
    ...query,
    ensureReferralCode: () => ensureReferralCode.mutateAsync(),
    fallbackCode: userId ? generateFallbackCode(userId) : null,
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
