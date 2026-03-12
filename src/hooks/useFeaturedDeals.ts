import { useMemo } from "react";
import { useDeals, type Deal } from "./useDeals";
import { useUserLocation, haversineDistance } from "./useUserLocation";

export interface FeaturedDeal extends Deal {
  distanceKm: number;
}

export function useFeaturedDeals() {
  const { data: deals = [], isLoading } = useDeals();
  const { location } = useUserLocation();

  const featuredDeals = useMemo(() => {
    return deals
      .filter((d) => !d.status || d.status === "active")
      .map((d) => ({
        ...d,
        distanceKm: haversineDistance(location.lat, location.lng, d.lat, d.lng),
      }))
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)) as FeaturedDeal[];
  }, [deals, location]);

  return { deals: featuredDeals, isLoading };
}
