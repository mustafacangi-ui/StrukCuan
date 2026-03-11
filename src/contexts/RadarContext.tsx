import { createContext, useContext, useState } from "react";
import { useDeals } from "@/hooks/useDeals";

const RadarContext = createContext(null);

export const useRadar = () => {
  const ctx = useContext(RadarContext);
  if (!ctx) throw new Error("useRadar must be used within RadarProvider");
  return ctx;
};

export const RadarProvider = ({ children }) => {
  const [radius, setRadius] = useState(5);
  const {
    data: deals = [],
    isLoading,
    error,
  } = useDeals();

  const promoCount = deals.length;

  return (
    <RadarContext.Provider
      value={{ radius, setRadius, promoCount, isLoading, error }}
    >
      {children}
    </RadarContext.Provider>
  );
};








