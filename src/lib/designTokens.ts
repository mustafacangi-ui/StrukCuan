/**
 * Unified Design System — Earn & Radar screens
 *
 * Color Roles:
 * - Green (#00E676): System, location, active data, progress
 * - Pink/Magenta Gradient: Primary CTA (Watch Ad, Shake, Navigate)
 * - Red (#ef4444): Alerts, Red Label deals
 */

export const COLORS = {
  green: "#00E676",
  greenGlow: "rgba(0,230,118,0.6)",
  greenMuted: "rgba(0,230,118,0.15)",
  greenBorder: "rgba(0,230,118,0.35)",

  red: "#ef4444",
  redGlow: "rgba(239,68,68,0.7)",
  redMuted: "rgba(239,68,68,0.15)",
  redBorder: "rgba(239,68,68,0.5)",

  pink: "#ec4899",
  purple: "#c026d3",
  violet: "#7c3aed",
} as const;

/** Primary CTA gradient — Watch Ad, Shake, Navigate */
export const PRIMARY_GRADIENT =
  "linear-gradient(135deg, #ec4899 0%, #c026d3 50%, #7c3aed 100%)";

/** Primary button glow */
export const PRIMARY_GLOW =
  "0 0 24px rgba(236,72,153,0.55), 0 4px 12px rgba(0,0,0,0.4)";

/** System green glow — radius, badges, progress */
export const SYSTEM_GLOW = "0 0 14px rgba(0,230,118,0.45)";

/** Standardized card — glassmorphism */
export const CARD_GLASS =
  "bg-zinc-900/60 backdrop-blur-3xl border border-white/10";

/** Standardized card classes */
export const CARD_BASE =
  "rounded-2xl p-4 " + CARD_GLASS + " shadow-2xl transition-all duration-300";

/** Standardized card large (rounded-3xl, p-5) */
export const CARD_LARGE =
  "rounded-3xl p-5 " + CARD_GLASS + " shadow-2xl transition-all duration-300";

/** Secondary/glass button */
export const BTN_GLASS =
  "bg-white/10 border border-white/15 hover:bg-white/20 transition-colors";

/** Unified pulse/glow animation timing */
export const ANIM_PULSE = "2s ease-in-out infinite";

/**
 * Premium page background — deep navy/purple gradient with subtle radial glows.
 * Matches the Home screen "gold standard" theme. Use on Invite, Radar, Rank, Earn, etc.
 */
export const PREMIUM_PAGE_BACKGROUND = `
  radial-gradient(ellipse 90% 55% at 50% -5%, rgba(155,92,255,0.16) 0%, transparent 60%),
  radial-gradient(ellipse 60% 40% at 10% 65%, rgba(100,40,200,0.1) 0%, transparent 50%),
  radial-gradient(ellipse 70% 50% at 90% 85%, rgba(255,78,205,0.07) 0%, transparent 50%),
  linear-gradient(180deg,#0c0920 0%,#0e0b1e 50%,#090714 100%)
`;
