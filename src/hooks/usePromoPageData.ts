import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useRadar } from "@/contexts/RadarContext";
import { haversineDistance } from "@/hooks/useUserLocation";
import type { Deal } from "./useDeals";
import type { PromoRow } from "./usePromos";
import { fetchPromosNearby } from "./usePromos";
import { fetchMonetagAdCountToday } from "./useMonetagAdTickets";
import { DEALS_QUERY_KEY } from "./useDeals";
import { PROMOS_QUERY_KEY } from "./usePromos";

export interface FeaturedDeal extends Deal {
  distanceKm: number;
}

function getTodayDateId(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return d.toISOString().slice(0, 10);
}

async function fetchFeaturedPromos(): Promise<Deal[]> {
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

/**
 * Fetches featured promos, community promos, and ticket count in parallel using Promise.all.
 * Used by the Promo page for instant render + progressive data loading.
 */
export function usePromoPageData(userId?: string | null) {
  const queryClient = useQueryClient();
  const { location } = useUserLocation();
  const { radius } = useRadar();
  const lat = location.lat;
  const lng = location.lng;

  const dateId = getTodayDateId();

  useEffect(() => {
    const chDeals = supabase
      .channel("realtime:deals")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
      })
      .subscribe();
    const chPromos = supabase
      .channel("realtime:promos")
      .on("postgres_changes", { event: "*", schema: "public", table: "promos" }, () => {
        queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_votes" }, () => {
        queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(chDeals);
      supabase.removeChannel(chPromos);
    };
  }, [queryClient]);

  const results = useQueries({
    queries: [
      {
        queryKey: DEALS_QUERY_KEY,
        queryFn: fetchFeaturedPromos,
      },
      {
        queryKey: [...PROMOS_QUERY_KEY, "nearby", lat, lng, userId, radius],
        queryFn: () => fetchPromosNearby(lat, lng, userId, radius),
        enabled: lat != null && lng != null,
      },
      {
        queryKey: ["monetag_ad_tickets", userId, dateId],
        queryFn: () => fetchMonetagAdCountToday(userId!),
        enabled: !!userId,
      },
    ],
  });

  const [featuredQuery, communityQuery, ticketQuery] = results;

  const featuredDeals = useMemo(() => {
    const deals = (featuredQuery.data ?? []) as Deal[];
    return deals
      .filter((d) => !d.status || d.status === "active")
      .map((d) => ({
        ...d,
        distanceKm: haversineDistance(lat, lng, d.lat, d.lng),
      }))
      .filter((d) => d.distanceKm <= radius)
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id ?? 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id ?? 0;
        return bTime - aTime;
      }) as FeaturedDeal[];
  }, [featuredQuery.data, lat, lng, radius]);

  const communityPromos = useMemo(() => {
    const promos = (communityQuery.data ?? []) as PromoRow[];
    return promos
      .map((p) => ({
        ...p,
        distance_km: haversineDistance(lat, lng, p.latitude, p.longitude),
      }))
      .filter((p) => p.distance_km <= radius)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [communityQuery.data, lat, lng, radius]);

  return {
    featuredDeals,
    communityPromos,
    ticketCount: ticketQuery.data ?? 0,
    featuredLoading: featuredQuery.isLoading,
    communityLoading: communityQuery.isLoading,
    ticketLoading: ticketQuery.isLoading,
    refetchFeatured: featuredQuery.refetch,
    refetchCommunity: communityQuery.refetch,
    refetchTicket: ticketQuery.refetch,
  };
}
