import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { isOlderThan24h } from "@/lib/formatRelativeTime";
import { CARD_GLASS } from "@/lib/designTokens";

function formatPrice(price?: number | null): string {
  if (price == null || price <= 0) return "Promo";
  return `Rp ${price.toLocaleString()}`;
}

interface DealCardProps {
  deal: DealWithDistance;
  onClick: () => void;
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const discount = (deal as DealWithDistance & { discount?: number }).discount;
  const discountStr = discount ? `-${discount}%` : "Promo";
  const isGreen = deal.promoType === "big_discount" || deal.promoType === "bonus_cuan";
  const glowColor = deal.isRedLabel ? "rgba(239,68,68,0.7)" : isGreen ? "rgba(74,222,128,0.7)" : "rgba(251,191,36,0.7)";
  const textColor = deal.isRedLabel ? "#ef4444" : isGreen ? "#4ade80" : "#fbbf24";
  const relativeTime = formatRelativeTime(deal.created_at);
  const isOld = isOlderThan24h(deal.created_at);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`rounded-2xl p-3.5 cursor-pointer transition-all duration-200 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50 ${CARD_GLASS}`}
      style={{
        border: deal.isRedLabel
          ? "1px solid rgba(239,68,68,0.3)"
          : undefined,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        opacity: isOld ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 20px ${glowColor.replace("0.7", "0.35")}, 0 4px 16px rgba(0,0,0,0.4)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)";
      }}
    >
      <p className="font-display font-bold text-white text-[15px]">
        {deal.product_name ?? "Promo"}
      </p>
      <p
        className="text-[12px] font-bold mt-1"
        style={{ color: textColor, textShadow: `0 0 10px ${glowColor}` }}
      >
        {discountStr} · {formatPrice(deal.price)}
      </p>
      <p className="text-[10px] text-white/50 mt-0.5">{deal.store}</p>
      {relativeTime && (
        <p className="flex items-center gap-1 mt-1.5 text-[10px] text-white/40">
          <span className="relative flex h-1 w-1 shrink-0">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-[#ef4444] animate-ping opacity-70"
              style={{ boxShadow: "0 0 3px #ef4444" }}
            />
            <span
              className="relative inline-flex h-full w-full rounded-full bg-[#ef4444]"
              style={{ boxShadow: "0 0 3px #ef4444" }}
            />
          </span>
          {relativeTime}
        </p>
      )}
    </div>
  );
}
