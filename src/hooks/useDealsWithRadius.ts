import { useMemo } from "react";
import { useDeals, type Deal } from "./useDeals";
import { useUserLocation, haversineDistance } from "./useUserLocation";

export type PromoType = "big_discount" | "bonus_cuan" | "normal";

/** Inferred from store/product for category filtering */
export type DealCategory = "Market" | "Cafe" | "Electronics" | "Fashion" | "General";

function inferCategory(deal: Deal): DealCategory {
  const store = (deal.store ?? "").toLowerCase();
  const product = (deal.product_name ?? "").toLowerCase();
  const combined = `${store} ${product}`;
  if (combined.includes("cafe") || combined.includes("coffee") || combined.includes("kopi")) return "Cafe";
  if (combined.includes("market") || combined.includes("mart") || combined.includes("super") || combined.includes("toko")) return "Market";
  if (combined.includes("tech") || combined.includes("electronic") || combined.includes("phone")) return "Electronics";
  if (combined.includes("fashion") || combined.includes("clothes") || combined.includes("pakaian")) return "Fashion";
  return "General";
}

export interface DealWithDistance extends Deal {
  distanceKm: number;
  promoType: PromoType;
  /** Kırmızı Etiket: discount >= 50% OR expiry within 48h OR is_red_label from DB */
  isRedLabel: boolean;
  category: DealCategory;
}

/** Expiry within 48 hours = Red Label (urgent) */
function isExpirySoon(expiry?: string | null): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const now = new Date();
  const hoursLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursLeft <= 48 && hoursLeft >= 0;
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
  const { location, loading: locationLoading } = useUserLocation();

  const { filteredDeals, userLocation } = useMemo(() => {
    const safeLat = Number.isFinite(location?.lat) ? location.lat : -6.2088;
    const safeLng = Number.isFinite(location?.lng) ? location.lng : 106.8456;
    const loc = { lat: safeLat, lng: safeLng };

    try {
      const raw = Array.isArray(deals) ? deals : [];
      const mapped = raw
        .filter((d): d is Deal => d != null && typeof d === "object" && Number.isFinite(d.lat) && Number.isFinite(d.lng))
        .map((d) => {
          const discount = (d as Deal & { discount?: number }).discount ?? 0;
          const isRedLabelDb = d.is_red_label ?? false;
          const isRedLabel =
            isRedLabelDb || discount >= 50 || isExpirySoon(d.expiry);
          return {
            ...d,
            distanceKm: haversineDistance(safeLat, safeLng, d.lat, d.lng),
            promoType: getPromoType(d),
            isRedLabel,
            category: inferCategory(d),
          };
        })
        .filter((d) => d.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm) as DealWithDistance[];

      return { filteredDeals: mapped, userLocation: loc };
    } catch {
      return { filteredDeals: [], userLocation: loc };
    }
  }, [deals, location, radiusKm]);

  return {
    deals: filteredDeals,
    isLoading: isLoading || locationLoading,
    userLocation,
    locationReady: !locationLoading,
  };
}
