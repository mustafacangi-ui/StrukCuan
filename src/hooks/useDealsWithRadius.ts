import { useMemo } from "react";
import { useDeals, type Deal } from "./useDeals";
import { useUserLocation, haversineDistance } from "./useUserLocation";

export type PromoType = "big_discount" | "bonus_cuan" | "normal";

export interface DealWithDistance extends Deal {
  distanceKm: number;
  promoType: PromoType;
}

function getPromoType(deal: Deal): PromoType {
  const price = deal.price ?? 0;
  const discount = (deal as Deal & { discount?: number }).discount ?? 0;
  if (discount >= 50 || price > 0 && price < 15000) return "big_discount";
  if (price >= 15000 && price < 50000) return "bonus_cuan";
  return "normal";
}

export function useDealsWithRadius(radiusKm: number) {
  const { data: deals = [], isLoading } = useDeals();
  const { location } = useUserLocation();

  const filteredDeals = useMemo(() => {
    return deals
      .map((d) => ({
        ...d,
        distanceKm: haversineDistance(
          location.lat,
          location.lng,
          d.lat,
          d.lng
        ),
        promoType: getPromoType(d),
      }))
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm) as DealWithDistance[];
  }, [deals, location, radiusKm]);

  return { deals: filteredDeals, isLoading, userLocation: location };
}
