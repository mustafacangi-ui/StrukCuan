import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const WHATSAPP_MESSAGE = (referralUrl: string, code?: string) => {
  const displayCode = code ?? (referralUrl.includes("?r=") ? new URL(referralUrl).searchParams.get("r") ?? "" : "");
  return `Selam! StrukCuan ile alışveriş fişlerimi bilete dönüştürüp ödüller kazanıyorum. Sen de katıl, ilk fişinde bonus bilet kazan! Kodum: ${displayCode} Link: ${referralUrl}`;
};

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
        .from("user_stats")
        .select("referral_code")
        .eq("user_id", userId)
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
        .from("user_stats")
        .update({ updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("referral_code")
        .single();
      if (!error && data?.referral_code) {
        return data.referral_code as string;
      }
      const { error: updateError } = await supabase
        .from("user_stats")
        .update({ referral_code: fallback, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (!updateError) return fallback;
      const { error: upsertError } = await supabase
        .from("user_stats")
        .upsert(
          { user_id: userId, referral_code: fallback, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
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
