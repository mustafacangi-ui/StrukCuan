import { useState } from "react";
import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import {
  formatRelativeTime,
  getAgeTier,
  type AgeTier,
} from "@/lib/formatRelativeTime";
import { CARD_GLASS } from "@/lib/designTokens";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Map age tier → card opacity */
function ageOpacity(tier: AgeTier): number {
  if (tier === "old") return 0.62;
  if (tier === "aging") return 0.82;
  return 1;
}

const CATEGORY_ICON: Record<string, string> = {
  Market: "🛒",
  Cafe: "☕",
  Electronics: "⚡",
  Fashion: "👗",
};

// ─── Live Dot ────────────────────────────────────────────────────────────────

function LiveDot({ tier }: { tier: AgeTier }) {
  const isFresh = tier === "fresh";
  return (
    <span className="relative flex items-center justify-center h-2 w-2 shrink-0">
      {/* Outer pulse ring — only when fresh */}
      {isFresh && (
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-[#ef4444] animate-red-ring-out"
          style={{ opacity: 0 }}
        />
      )}
      {/* Core dot with live-dot animation */}
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444] animate-live-dot"
        style={{ boxShadow: "0 0 4px rgba(239,68,68,0.9)" }}
      />
    </span>
  );
}

// ─── Distance Badge ───────────────────────────────────────────────────────────

function DistanceBadge({
  km,
  isRedLabel,
  showPulseRing,
}: {
  km: number;
  isRedLabel: boolean;
  showPulseRing: boolean;
}) {
  return (
    <div className="relative shrink-0 ml-3 flex items-center justify-center">
      {/* Outer pulse ring — Red Label only */}
      {showPulseRing && (
        <span
          className="absolute rounded-xl animate-red-ring-out pointer-events-none"
          style={{
            inset: "-6px",
            border: "1.5px solid rgba(239,68,68,0.5)",
            borderRadius: "14px",
          }}
        />
      )}

      <span
        className="relative rounded-xl px-3 py-1.5 text-[11px] font-bold block whitespace-nowrap"
        style={
          isRedLabel
            ? {
                background: "rgba(239,68,68,0.12)",
                border: "1.5px dashed rgba(239,68,68,0.5)",
                color: "#ef4444",
                textShadow: "0 0 8px rgba(239,68,68,0.8)",
                animation: "red-badge-pulse 2s ease-in-out infinite",
              }
            : {
                background: "rgba(0,230,118,0.1)",
                border: "1px solid rgba(0,230,118,0.35)",
                color: "#00E676",
                textShadow: "0 0 6px rgba(0,230,118,0.6)",
                animation: "green-badge-glow 2s ease-in-out infinite",
              }
        }
      >
        {formatDist(km)}
      </span>
    </div>
  );
}

// ─── NearbyRow ────────────────────────────────────────────────────────────────

export interface NearbyRowProps {
  deal: DealWithDistance;
  onClick: () => void;
  /** Stagger index — controls entry animation delay */
  index?: number;
}

export default function NearbyRow({ deal, onClick, index = 0 }: NearbyRowProps) {
  const [pressed, setPressed] = useState(false);

  const isVeryClose = deal.distanceKm <= 0.5;
  const category = deal.category;
  const relativeTime = formatRelativeTime(deal.created_at);
  const tier = getAgeTier(deal.created_at);
  const opacity = ageOpacity(tier);
  const isFresh = tier === "fresh";
  const showPulseRing = deal.isRedLabel && isVeryClose;

  const categoryIcon = CATEGORY_ICON[category] ?? "🏪";

  // Stagger: 0, 60, 120 ... ms, capped at 480ms
  const entryDelay = `${Math.min(index * 60, 480)}ms`;

  // Float: only for fresh/recent, stagger offset so cards don't all float together
  const floatDelay = `${(index * 0.4) % 4}s`;
  const shouldFloat = tier === "fresh" || tier === "recent";

  return (
    <div
      className="relative"
      style={{
        animation: `nearby-enter 0.35s cubic-bezier(0.16,1,0.3,1) ${entryDelay} both`,
        opacity,
      }}
    >
      {/* Subtle outer ring for Red Label — expands and fades */}
      {deal.isRedLabel && (
        <span
          className="absolute pointer-events-none rounded-2xl animate-red-ring-out"
          style={{
            inset: "-3px",
            border: "1px solid rgba(239,68,68,0.4)",
          }}
        />
      )}

      {/* Float wrapper — only for fresh/recent deals */}
      <div
        style={
          shouldFloat
            ? {
                animation: `nearby-float 4s ease-in-out ${floatDelay} infinite`,
              }
            : undefined
        }
      >
        {/* Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === "Enter" && onClick()}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          className={`relative overflow-hidden rounded-2xl p-3.5 flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50 ${CARD_GLASS}`}
          style={{
            border: deal.isRedLabel ? "1px solid rgba(239,68,68,0.2)" : undefined,
            transform: pressed ? "scale(0.97)" : "scale(1)",
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease",
            boxShadow: isFresh && !deal.isRedLabel
              ? "0 0 18px rgba(0,230,118,0.1)"
              : undefined,
            animation: isFresh && !deal.isRedLabel
              ? "fresh-glow 2s ease-in-out infinite"
              : undefined,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.boxShadow = deal.isRedLabel
              ? "0 0 20px rgba(239,68,68,0.2), 0 4px 16px rgba(0,0,0,0.4)"
              : "0 0 18px rgba(0,230,118,0.12), 0 4px 12px rgba(0,0,0,0.4)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.boxShadow =
              isFresh && !deal.isRedLabel ? "0 0 18px rgba(0,230,118,0.1)" : "none";
          }}
        >
          {/* Red Label animated dashed border overlay */}
          {deal.isRedLabel && (
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none animate-red-dash-pulse"
              style={{
                border: "1.5px dashed rgba(239,68,68,0.55)",
              }}
            />
          )}

          {/* Left: icon + text */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Category icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
              style={{
                background: deal.isRedLabel
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(168,85,247,0.12)",
                border: deal.isRedLabel
                  ? "1px solid rgba(239,68,68,0.25)"
                  : "1px solid rgba(168,85,247,0.2)",
              }}
            >
              {categoryIcon}
            </div>

            <div className="min-w-0">
              {/* Store name */}
              <p className="font-display font-bold text-white text-sm leading-tight">
                {deal.store ?? "Store"}
              </p>

              {/* Distance · category · Red Label tag */}
              <p className="text-[11px] text-white/50 mt-0.5 leading-tight">
                {formatDist(deal.distanceKm)} · {category}
                {deal.isRedLabel && (
                  <span
                    className="ml-1.5 font-semibold text-[#ef4444]"
                    style={{ textShadow: "0 0 6px rgba(239,68,68,0.7)" }}
                  >
                    · Red Label
                  </span>
                )}
              </p>

              {/* Timestamp with live dot */}
              {relativeTime && (
                <p className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/40 leading-none">
                  <LiveDot tier={tier} />
                  <span
                    style={
                      isFresh
                        ? {
                            color: "rgba(255,255,255,0.75)",
                            textShadow: "0 0 8px rgba(255,255,255,0.3)",
                          }
                        : undefined
                    }
                  >
                    {relativeTime}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Right: distance badge */}
          <DistanceBadge
            km={deal.distanceKm}
            isRedLabel={deal.isRedLabel}
            showPulseRing={showPulseRing}
          />
        </div>
      </div>
    </div>
  );
}
