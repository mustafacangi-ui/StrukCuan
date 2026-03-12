import { useMemo } from "react";
import { useDeals, type Deal } from "./useDeals";
import { useUserLocation, haversineDistance } from "./useUserLocation";
import { useRadar } from "@/contexts/RadarContext";

export interface FeaturedDeal extends Deal {
  distanceKm: number;
}

export function useFeaturedDeals() {
  const { radius } = useRadar();
  const { data: deals = [], isLoading } = useDeals();
  const { location } = useUserLocation();

  const featuredDeals = useMemo(() => {
    return deals
      .filter((d) => !d.status || d.status === "active")
      .map((d) => ({
        ...d,
        distanceKm: haversineDistance(location.lat, location.lng, d.lat, d.lng),
      }))
      .filter((d) => d.distanceKm <= radius)
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id ?? 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id ?? 0;
        return bTime - aTime;
      }) as FeaturedDeal[];
  }, [deals, location, radius]);

  return { deals: featuredDeals, isLoading };
}
