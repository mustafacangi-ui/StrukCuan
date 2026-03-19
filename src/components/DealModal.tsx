import { X, Navigation } from "lucide-react";
import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatPrice(price?: number | null): string {
  if (price == null || price <= 0) return "Promo";
  return `Rp ${price.toLocaleString()}`;
}

function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

interface DealModalProps {
  deal: DealWithDistance;
  onClose: () => void;
}

export default function DealModal({ deal, onClose }: DealModalProps) {
  const discount = (deal as DealWithDistance & { discount?: number }).discount;
  const discountStr = discount ? `-${discount}%` : "Promo";
  const relativeTime = formatRelativeTime(deal.created_at);
  const isRedLabel = deal.isRedLabel;

  const handleNavigate = () => {
    window.open(getGoogleMapsUrl(deal.lat, deal.lng), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          background: "linear-gradient(180deg, rgba(15,7,38,0.98) 0%, rgba(10,5,25,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          boxShadow: isRedLabel
            ? "0 -8px 32px rgba(239,68,68,0.15), 0 0 24px rgba(0,0,0,0.5)"
            : "0 -8px 32px rgba(0,230,118,0.08), 0 0 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-12 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
        </div>

        <div className="px-4 pb-8 pt-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-white text-lg leading-tight">
                {deal.store ?? "Store"}
              </h3>
              <p className="text-sm text-white/70 mt-0.5">
                {deal.product_name ?? "Promo available"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              aria-label="Close"
            >
              <X size={18} className="text-white/80" />
            </button>
          </div>

          {/* Image + price block */}
          <div className="flex gap-4 mb-4">
            {deal.image ? (
              <img
                src={deal.image}
                alt={deal.product_name ?? "Product"}
                className="w-20 h-20 rounded-xl object-cover shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-white/30 text-xs"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                No img
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="font-display font-bold text-lg"
                style={{
                  color: isRedLabel ? "#ef4444" : "#00E676",
                  textShadow: isRedLabel
                    ? "0 0 10px rgba(239,68,68,0.6)"
                    : "0 0 10px rgba(0,230,118,0.6)",
                }}
              >
                {formatPrice(deal.price)}
              </p>
              <p className="text-xs text-white/50 mt-1">{discountStr}</p>
            </div>
          </div>

          {/* Meta row: distance, time, status */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
              style={{
                background: "rgba(0,230,118,0.12)",
                border: "1px solid rgba(0,230,118,0.3)",
                color: "#00E676",
              }}
            >
              {formatDist(deal.distanceKm)} away
            </span>
            {relativeTime && (
              <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full bg-[#ef4444] animate-ping opacity-70"
                    style={{ boxShadow: "0 0 4px #ef4444" }}
                  />
                  <span
                    className="relative inline-flex h-full w-full rounded-full bg-[#ef4444]"
                    style={{ boxShadow: "0 0 4px #ef4444" }}
                  />
                </span>
                Live · {relativeTime}
              </span>
            )}
            {isRedLabel && (
              <span
                className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1.5px dashed rgba(239,68,68,0.5)",
                  color: "#ef4444",
                  textShadow: "0 0 6px rgba(239,68,68,0.7)",
                }}
              >
                Red Label
              </span>
            )}
            {!isRedLabel && (
              <span
                className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                style={{
                  background: "rgba(0,230,118,0.1)",
                  border: "1px solid rgba(0,230,118,0.35)",
                  color: "#00E676",
                }}
              >
                Verified
              </span>
            )}
          </div>

          {/* Navigate button — Primary CTA = pink gradient (unified with Earn) */}
          <button
            onClick={handleNavigate}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #c026d3 50%, #7c3aed 100%)",
              boxShadow: "0 0 24px rgba(236,72,153,0.55), 0 4px 12px rgba(0,0,0,0.4)",
              animation: "unified-pulse 2s ease-in-out infinite",
            }}
          >
            <Navigation size={18} />
            Navigate
          </button>
        </div>
      </div>
    </>
  );
}
