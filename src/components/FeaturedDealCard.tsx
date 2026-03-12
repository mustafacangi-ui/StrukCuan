import { MapPin } from "lucide-react";
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
  const discount = (deal as FeaturedDeal & { discount?: number }).discount;
  const discountStr = discount ? `-${discount}%` : "Promo";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
      </div>
    </div>
  );
}
