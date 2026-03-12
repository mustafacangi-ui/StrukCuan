import { useMemo } from "react";
import { useDeals } from "./useDeals";
import { useUserLocation, haversineDistance } from "./useUserLocation";
import { usePromosNearby } from "./usePromos";

export type RadarMarkerSource = "deal" | "promo";

export interface RadarMarker {
  id: string;
  source: RadarMarkerSource;
  lat: number;
  lng: number;
  storeName: string;
  productName: string;
  discount: number;
  distanceKm: number;
  price?: number;
}

function getMarkerColor(discount: number): string {
  if (discount > 40) return "#FF3B3B"; // red
  if (discount >= 20) return "#FFD93D"; // yellow
  return "#00FF88"; // green
}

export function useRadarPromos(radiusKm: number, userId?: string | null) {
  const { location } = useUserLocation();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: promos = [], isLoading: promosLoading } = usePromosNearby(
    location.lat,
    location.lng,
    userId,
    radiusKm
  );

  const markers = useMemo(() => {
    const result: RadarMarker[] = [];

    deals
      .filter((d) => !d.status || d.status === "active")
      .forEach((d) => {
        const dist = haversineDistance(location.lat, location.lng, d.lat, d.lng);
        if (dist <= radiusKm) {
          const discount = (d as { discount?: number }).discount ?? 0;
          result.push({
            id: `deal-${d.id}`,
            source: "deal",
            lat: d.lat,
            lng: d.lng,
            storeName: d.store ?? "Toko",
            productName: d.product_name ?? "Promo",
            discount,
            distanceKm: dist,
            price: d.price,
          });
        }
      });

    promos
      .filter((p) => !p.is_expired_by_time && p.status !== "expired")
      .forEach((p) => {
        const dist = p.distance_km ?? haversineDistance(location.lat, location.lng, p.latitude, p.longitude);
        if (dist <= radiusKm) {
          result.push({
            id: `promo-${p.id}`,
            source: "promo",
            lat: p.latitude,
            lng: p.longitude,
            storeName: p.store_name,
            productName: p.product_name,
            discount: p.discount,
            distanceKm: dist,
          });
        }
      });

    return result;
  }, [deals, promos, location, radiusKm]);

  return {
    markers,
    isLoading: dealsLoading || promosLoading,
    getMarkerColor,
  };
}
