import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function updateUserCountry(countryCode: string): Promise<void> {
  const code = countryCode.toUpperCase().slice(0, 2);
  if (!["ID", "DE", "TR"].includes(code)) {
    throw new Error("Invalid country");
  }
  const { error } = await supabase.rpc("update_user_country", {
    p_country_code: code,
  });
  if (error) throw error;
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserCountry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: ["todayRewardedTickets"] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      queryClient.invalidateQueries({ queryKey: ["lottery_winners"] });
    },
  });
}
