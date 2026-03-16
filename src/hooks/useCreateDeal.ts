import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DEALS_QUERY_KEY } from "./useDeals";

export interface CreateDealInput {
  lat: number;
  lng: number;
  product_name: string;
  price?: number;
  store: string;
  image_url: string;
  discount?: number;
  expiry?: string;
  is_red_label?: boolean;
}

async function createDeal(input: CreateDealInput) {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      lat: input.lat,
      lng: input.lng,
      product_name: input.product_name,
      price: input.price ?? null,
      store: input.store,
      image: input.image_url,
      status: "active",
      discount: input.discount ?? null,
      expiry: input.expiry ?? null,
      is_red_label: input.is_red_label ?? false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[useCreateDeal] Insert failed:", {
      message: error.message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
      full: error,
    });
    throw error;
  }
  return data;
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
    },
  });
}
