import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const DEALS_QUERY_KEY = ["deals"];

export interface Deal {
  id: number;
  lat: number;
  lng: number;
  product_name?: string;
  price?: number;
  store?: string;
  image?: string | null;
  status?: string;
  created_at?: string;
  discount?: number;
  expiry?: string;
}

async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to fetch deals", error);
    throw error;
  }

  return (data as Deal[]) ?? [];
}

export function useDeals() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: DEALS_QUERY_KEY,
    queryFn: fetchDeals,
    refetchInterval: 30000,
  });

  // Keep Supabase realtime subscription and invalidate the deals query on changes
  useEffect(() => {
    const channel = supabase
      .channel("realtime:deals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals" },
        () => {
          queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Supabase realtime channel error for deals");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

