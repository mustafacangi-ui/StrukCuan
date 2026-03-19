import { useState } from "react";
import type { CSSProperties } from "react";
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

/** Map age tier → card opacity for visual decay */
function ageOpacity(tier: AgeTier): number {
  if (tier === "old") return 0.62;
  if (tier === "aging") return 0.82;
  return 1;
}

/**
 * Distance-based signal animation name + duration.
 * Closer = stronger glow, faster pulse.
 */
function getSignalAnim(
  km: number,
  isRedLabel: boolean
): { name: string; duration: string } {
  if (isRedLabel) return { name: "signal-red", duration: "2s" };
  if (km < 0.3) return { name: "signal-close", duration: "2s" };
  if (km < 1.0) return { name: "signal-medium", duration: "2.5s" };
  return { name: "signal-far", duration: "3s" };
}

const CATEGORY_ICON: Record<string, string> = {
  Market: "🛒",
  Cafe: "☕",
  Electronics: "⚡",
  Fashion: "👗",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pulsing live dot next to timestamp */
function LiveDot({ tier }: { tier: AgeTier }) {
  const isFresh = tier === "fresh";
  return (
    <span className="relative flex items-center justify-center h-2 w-2 shrink-0">
      {isFresh && (
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-[#ef4444]"
          style={{ animation: "red-ring-out 2s ease-out infinite" }}
        />
      )}
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444]"
        style={{
          boxShadow: "0 0 4px rgba(239,68,68,0.9)",
          animation: "live-dot 1.5s ease-in-out infinite",
        }}
      />
    </span>
  );
}

/** Distance badge — green or red, with per-signal glow animation */
function DistanceBadge({
  km,
  isRedLabel,
}: {
  km: number;
  isRedLabel: boolean;
}) {
  const sig = getSignalAnim(km, isRedLabel);
  return (
    <div className="relative shrink-0 ml-3 flex items-center justify-center">
      {/* Pulse ring for very-close Red Label */}
      {isRedLabel && km <= 0.5 && (
        <span
          className="absolute pointer-events-none rounded-xl"
          style={{
            inset: "-6px",
            border: "1.5px solid rgba(239,68,68,0.45)",
            borderRadius: "14px",
            animation: "red-ring-out 2.5s ease-out infinite",
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
                animation: `${sig.name} ${sig.duration} ease-in-out infinite`,
              }
            : {
                background: "rgba(0,230,118,0.1)",
                border: "1px solid rgba(0,230,118,0.35)",
                color: "#00E676",
                textShadow: "0 0 6px rgba(0,230,118,0.6)",
                animation: `green-badge-glow 2s ease-in-out infinite`,
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

  const category = deal.category;
  const relativeTime = formatRelativeTime(deal.created_at);
  const tier = getAgeTier(deal.created_at);
  const isFresh = tier === "fresh";
  const opacity = ageOpacity(tier);
  const shouldFloat = tier === "fresh" || tier === "recent";

  const sig = getSignalAnim(deal.distanceKm, deal.isRedLabel);
  const categoryIcon = CATEGORY_ICON[category] ?? "🏪";

  // Stagger entry: 0 → 480ms max
  const entryDelay = `${Math.min(index * 55, 480)}ms`;
  // Float: offset per-card so they don't all move in sync
  const floatDelay = `${(index * 0.55) % 4}s`;

  // Card press spring: scale down on tap, spring back
  const cardStyle: CSSProperties = {
    border: deal.isRedLabel ? "1px solid rgba(239,68,68,0.2)" : undefined,
    transform: pressed ? "scale(0.97)" : "scale(1)",
    transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
    // Signal-strength glow animates continuously
    animation: `${sig.name} ${sig.duration} ease-in-out infinite`,
  };

  return (
    <div
      className="relative"
      style={{
        animation: `nearby-enter 0.38s cubic-bezier(0.16,1,0.3,1) ${entryDelay} both`,
        opacity,
      }}
    >
      {/* ── Red Label ripple rings — two concentric, staggered ── */}
      {deal.isRedLabel && (
        <>
          <span
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: "1px solid rgba(239,68,68,0.35)",
              animation: "red-ripple 2.5s ease-out 0s infinite",
            }}
          />
          <span
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: "1px solid rgba(239,68,68,0.25)",
              animation: "red-ripple 2.5s ease-out 1s infinite",
            }}
          />
        </>
      )}

      {/* ── Idle float (fresh/recent only) ── */}
      <div
        style={
          shouldFloat
            ? { animation: `nearby-float 4s ease-in-out ${floatDelay} infinite` }
            : undefined
        }
      >
        {/* ── Card ── */}
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === "Enter" && onClick()}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.filter =
              "brightness(1.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.filter = "";
          }}
          className={`relative overflow-hidden rounded-2xl p-3.5 flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50 ${CARD_GLASS}`}
          style={cardStyle}
        >
          {/* Entry glow burst — flashes once on mount then disappears */}
          <span
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: deal.isRedLabel
                ? "rgba(239,68,68,0.06)"
                : "rgba(0,230,118,0.055)",
              animation: `entry-glow 0.6s ease-out ${entryDelay} forwards`,
              opacity: 0,
            }}
            aria-hidden
          />

          {/* Red Label animated dashed border overlay */}
          {deal.isRedLabel && (
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none animate-red-dash-pulse"
              style={{ border: "1.5px dashed rgba(239,68,68,0.55)" }}
            />
          )}

          {/* Fresh card inner glow overlay */}
          {isFresh && !deal.isRedLabel && (
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: "rgba(0,230,118,0.04)",
                animation: "fresh-glow 2s ease-in-out infinite",
              }}
              aria-hidden
            />
          )}

          {/* ── Left: icon + store info ── */}
          <div className="flex items-center gap-3 min-w-0">
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
              <p className="font-display font-bold text-white text-sm leading-tight">
                {deal.store ?? "Store"}
              </p>
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
              {relativeTime && (
                <p className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/40 leading-none">
                  <LiveDot tier={tier} />
                  <span
                    style={
                      isFresh
                        ? {
                            color: "rgba(255,255,255,0.78)",
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

          {/* ── Right: distance badge ── */}
          <DistanceBadge km={deal.distanceKm} isRedLabel={deal.isRedLabel} />
        </div>
      </div>
    </div>
  );
}
