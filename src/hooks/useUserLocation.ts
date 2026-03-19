import { useState, useEffect } from "react";

export interface UserLocation {
  lat: number;
  lng: number;
}

const JAKARTA_CENTER = { lat: -6.2088, lng: 106.8456 };

/** Safe fallback coords — never NaN, used when GPS is slow or fails */
export const SAFE_DEFAULT_COORDS = { lat: -6.2088, lng: 106.8456 };

function safeCoords(lat: number, lng: number): UserLocation {
  const safeLat = Number.isFinite(lat) ? lat : JAKARTA_CENTER.lat;
  const safeLng = Number.isFinite(lng) ? lng : JAKARTA_CENTER.lng;
  return { lat: safeLat, lng: safeLng };
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (!navigator?.geolocation) {
        setLocation(JAKARTA_CENTER);
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            const lat = pos?.coords?.latitude ?? JAKARTA_CENTER.lat;
            const lng = pos?.coords?.longitude ?? JAKARTA_CENTER.lng;
            setLocation(safeCoords(lat, lng));
            setError(null);
          } catch (e) {
            setLocation(JAKARTA_CENTER);
            setError("Location parse error");
          }
          setLoading(false);
        },
        () => {
          setLocation(JAKARTA_CENTER);
          setError("Location unavailable");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } catch (e) {
      setLocation(JAKARTA_CENTER);
      setError("Geolocation error");
      setLoading(false);
    }
  }, []);

  const resolved = location ?? JAKARTA_CENTER;
  return {
    location: safeCoords(resolved.lat, resolved.lng),
    error,
    loading,
  };
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
