import { useQuery } from "@tanstack/react-query";
import { fetchBitLabsSurveys, bitlabsValueToCuan, type BitLabsSurvey } from "@/lib/bitlabs";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export interface SurveyDisplay {
  id: string;
  title: string;
  rewardCuan: number;
  durationMin: number;
  category: string;
  clickUrl: string;
}

function toDisplay(s: BitLabsSurvey): SurveyDisplay {
  return {
    id: s.id,
    title: s.category?.name ?? "Survey",
    rewardCuan: bitlabsValueToCuan(s.value),
    durationMin: Math.round(s.loi ?? 0),
    category: s.category?.name_internal ?? "",
    clickUrl: s.click_url,
  };
}

export function useBitLabsSurveys(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["bitlabs_surveys", userId],
    queryFn: () => fetchBitLabsSurveys(userId, SUPABASE_URL, SUPABASE_ANON_KEY),
    enabled: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
    staleTime: 60_000,
  });

  const surveys: SurveyDisplay[] = (query.data ?? []).map(toDisplay);
  return { ...query, surveys };
}
