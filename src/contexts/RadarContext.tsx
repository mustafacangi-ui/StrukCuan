import { createContext, useContext, useState, ReactNode } from "react";
import { useDealsWithRadius } from "@/hooks/useDealsWithRadius";

interface RadarContextType {
  radius: number;
  setRadius: (r: number) => void;
  promoCount: number;
  isLoading: boolean;
}

const RadarContext = createContext<RadarContextType | null>(null);

export const useRadar = () => {
  const ctx = useContext(RadarContext);
  if (!ctx) throw new Error("useRadar must be used within RadarProvider");
  return ctx;
};

export const RadarProvider = ({ children }: { children: ReactNode }) => {
  const [radius, setRadius] = useState(5);
  const { deals, isLoading } = useDealsWithRadius(radius);

  return (
    <RadarContext.Provider
      value={{ radius, setRadius, promoCount: deals.length, isLoading }}
    >
      {children}
    </RadarContext.Provider>
  );
};








