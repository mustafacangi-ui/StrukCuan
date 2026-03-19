import { Marker } from "react-map-gl";
import type { DealWithDistance } from "@/hooks/useDealsWithRadius";

function formatPrice(price?: number | null): string {
  if (price == null || price <= 0) return "Promo";
  return `Rp ${price.toLocaleString()}`;
}

const RED_LABEL_PIN = { bg: "#FF0000", glow: "rgba(255,0,0,0.9)" };
const RED_PIN = { bg: "#FF3B3B", glow: "rgba(255,59,59,0.8)" };
const GREEN_PIN = { bg: "#00E676", glow: "rgba(0,230,118,0.6)" };

interface MapMarkerProps {
  deal: DealWithDistance;
  onClick: () => void;
  isSelected?: boolean;
}

export default function MapMarker({ deal, onClick, isSelected }: MapMarkerProps) {
  const priceLabel = formatPrice(deal.price);
  const isRedLabel = deal.isRedLabel;
  const pin = isRedLabel ? RED_LABEL_PIN : GREEN_PIN;

  return (
    <Marker
      latitude={deal.lat}
      longitude={deal.lng}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <button
        type="button"
        className="flex flex-col items-center cursor-pointer group"
        aria-label={`Promo: ${deal.store ?? "Store"} - ${priceLabel}`}
      >
        <div
          className={`rounded-md border-2 border-white px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap shadow-lg flex items-center gap-0.5 transition-transform ${
            isRedLabel ? "animate-pulse" : ""
          } ${isSelected ? "scale-110 ring-2 ring-[#00E676]" : ""}`}
          style={{
            backgroundColor: pin.bg,
            boxShadow: `0 0 ${isRedLabel ? 14 : 10}px ${pin.glow}`,
          }}
        >
          {isRedLabel && <span className="text-[10px]">🔥</span>}
          {priceLabel}
        </div>
        <div
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-0.5"
          style={{ borderTopColor: pin.bg }}
        />
      </button>
    </Marker>
  );
}
