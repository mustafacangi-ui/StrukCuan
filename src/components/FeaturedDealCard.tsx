import { MapPin, Timer } from "lucide-react";
import type { FeaturedDeal } from "@/hooks/useFeaturedDeals";

interface FeaturedDealCardProps {
  deal: FeaturedDeal;
}

function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m dari kamu`;
  return `${km.toFixed(1)} km dari kamu`;
}

function formatPrice(price?: number | null): string {
  if (price == null || price <= 0) return "Promo";
  return `Rp ${price.toLocaleString()}`;
}

export default function FeaturedDealCard({ deal }: FeaturedDealCardProps) {
  const priceStr = formatPrice(deal.price);
  const discount = deal.discount ?? 0;
  const discountStr = discount ? `-${discount}%` : "Promo";
  const hasExpiry = !!deal.expiry;

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      {/* LIVE badge */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-[#111] px-1.5 py-0.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
        <span className="text-[8px] font-bold text-red-500">LIVE</span>
      </div>

      {deal.image && (
        <div className="aspect-[4/3] bg-secondary/50">
          <img
            src={deal.image}
            alt={deal.product_name ?? "Promo"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <p className="font-display text-sm font-bold text-foreground">
          {deal.store ?? "Toko"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <MapPin size={10} />
          <span>{formatDistance(deal.distanceKm)}</span>
        </p>
        <p className="text-xs text-foreground mt-1">
          {deal.product_name ?? "Promo tersedia"}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            {discountStr}
          </span>
          <span className="text-sm font-bold text-primary">{priceStr}</span>
        </div>
        {hasExpiry && (
          <div className="mt-2 flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-1">
            <Timer size={10} className="text-primary" />
            <span className="text-[10px] font-bold text-primary">
              Berakhir: {deal.expiry}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
