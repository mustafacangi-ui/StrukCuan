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
  user_id?: string;
}

async function createDeal(input: CreateDealInput) {
  const priceVal = input.price != null ? Number(input.price) : null;
  const discountVal = input.discount != null ? Number(input.discount) : null;
  const payload: Record<string, unknown> = {
    lat: Number(input.lat),
    lng: Number(input.lng),
    product_name: String(input.product_name ?? ""),
    price: priceVal != null && !Number.isNaN(priceVal) ? priceVal : null,
    store: String(input.store ?? ""),
    image: String(input.image_url ?? ""),
    status: "active",
    discount: discountVal != null && !Number.isNaN(discountVal) ? discountVal : null,
    expiry: input.expiry ? String(input.expiry) : null,
    is_red_label: Boolean(input.is_red_label ?? false),
  };
  if (input.user_id) payload.user_id = String(input.user_id);
  const { data, error } = await supabase
    .from("deals")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    const err = error as { message?: string; code?: string; details?: string; hint?: string };
    console.error("[useCreateDeal] Insert failed - 400 sebebi genelde yanlış kolon veya tip:", {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      payload_keys: Object.keys(payload),
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
      queryClient.invalidateQueries({ queryKey: ["user_deals_count"] });
    },
  });
}
