import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { isOlderThan24h } from "@/lib/formatRelativeTime";
import { CARD_GLASS } from "@/lib/designTokens";

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

interface NearbyRowProps {
  deal: DealWithDistance;
  onClick: () => void;
}

export default function NearbyRow({ deal, onClick }: NearbyRowProps) {
  const isVeryClose = deal.distanceKm <= 0.5;
  const showPulseRing = deal.isRedLabel && isVeryClose;
  const category = deal.category;
  const relativeTime = formatRelativeTime(deal.created_at);
  const isOld = isOlderThan24h(deal.created_at);

  const categoryIcon =
    category === "Market" ? "🛒"
    : category === "Cafe" ? "☕"
    : category === "Electronics" ? "⚡"
    : category === "Fashion" ? "👗"
    : "🏪";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.015] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50 ${CARD_GLASS}`}
      style={{
        border: deal.isRedLabel
          ? "1px solid rgba(239,68,68,0.2)"
          : undefined,
        opacity: isOld ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 0 16px rgba(168,85,247,0.25), 0 4px 12px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
          style={{
            background: deal.isRedLabel ? "rgba(239,68,68,0.12)" : "rgba(168,85,247,0.12)",
            border: deal.isRedLabel ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(168,85,247,0.2)",
          }}
        >
          {categoryIcon}
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-white text-sm leading-tight">
            {deal.store ?? "Store"}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {formatDist(deal.distanceKm)} · {category}
            {deal.isRedLabel && (
              <span
                className="ml-1.5 text-[#ef4444]"
                style={{ textShadow: "0 0 6px rgba(239,68,68,0.7)" }}
              >
                Red Label
              </span>
            )}
          </p>
          {relativeTime && (
            <p className="flex items-center gap-1 mt-0.5 text-[10px] text-white/40">
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
      </div>

      <div className="relative shrink-0 ml-3 flex items-center justify-center">
        {showPulseRing && (
          <span
            className="absolute rounded-xl animate-pulse"
            style={{
              inset: "-4px",
              border: "1.5px dashed rgba(239,68,68,0.65)",
              boxShadow: "0 0 8px rgba(239,68,68,0.35)",
            }}
          />
        )}
        <span
          className="relative rounded-xl px-3 py-1.5 text-[11px] font-bold block whitespace-nowrap"
          style={
            deal.isRedLabel
              ? {
                  background: "rgba(239,68,68,0.12)",
                  border: "1.5px dashed rgba(239,68,68,0.5)",
                  color: "#ef4444",
                  textShadow: "0 0 8px rgba(239,68,68,0.8)",
                  boxShadow: "0 0 10px rgba(239,68,68,0.2)",
                }
              : {
                  background: "rgba(0,230,118,0.1)",
                  border: "1px solid rgba(0,230,118,0.35)",
                  color: "#00E676",
                  textShadow: "0 0 6px rgba(0,230,118,0.6)",
                }
          }
        >
          {formatDist(deal.distanceKm)}
        </span>
      </div>
    </div>
  );
}
