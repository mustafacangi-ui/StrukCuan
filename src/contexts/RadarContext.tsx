import { createContext, useContext, useState, ReactNode } from "react";
import { useDealsWithRadius } from "@/hooks/useDealsWithRadius";
import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import type { UserLocation } from "@/hooks/useUserLocation";
import { SAFE_DEFAULT_COORDS } from "@/hooks/useUserLocation";

interface RadarContextType {
  radius: number;
  setRadius: (r: number) => void;
  promoCount: number;
  isLoading: boolean;
  deals: DealWithDistance[];
  userLocation: UserLocation;
  locationReady: boolean;
}

const RadarContext = createContext<RadarContextType | null>(null);

export const useRadar = () => {
  const ctx = useContext(RadarContext);
  if (!ctx) throw new Error("useRadar must be used within RadarProvider");
  return ctx;
};

export const RadarProvider = ({ children }: { children: ReactNode }) => {
  const [radius, setRadius] = useState(5);
  const { deals = [], isLoading, userLocation, locationReady } = useDealsWithRadius(radius);

  const safeDeals = Array.isArray(deals) ? deals : [];
  const safeLocation: UserLocation = userLocation ?? SAFE_DEFAULT_COORDS;

  return (
    <RadarContext.Provider
      value={{
        radius,
        setRadius,
        promoCount: safeDeals.length,
        isLoading: Boolean(isLoading),
        deals: safeDeals,
        userLocation: safeLocation,
        locationReady: Boolean(locationReady),
      }}
    >
      {children}
    </RadarContext.Provider>
  );
};








