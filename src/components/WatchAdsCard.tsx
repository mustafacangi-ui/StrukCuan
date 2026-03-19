import { useState } from "react";
import type { CSSProperties } from "react";

interface WatchAdsCardProps {
  adsWatched: number;
  maxAds: number;
  isWeeklyLimitReached: boolean;
  showModal: boolean;
  onWatchAd: () => void;
}

export default function WatchAdsCard({
  adsWatched,
  maxAds,
  isWeeklyLimitReached,
  showModal,
  onWatchAd,
}: WatchAdsCardProps) {
  const [isProgressShaking, setIsProgressShaking] = useState(false);

  const watched = adsWatched ?? 0;
  const isFull = watched >= maxAds;
  const progressPct = Math.min(100, (watched / maxAds) * 100);
  const isDisabled = isFull || isWeeklyLimitReached || showModal;

  const handleClick = () => {
    // Shake the liquid even when full / already disabled to give feedback
    if (watched > 0) {
      setIsProgressShaking(true);
      setTimeout(() => setIsProgressShaking(false), 420);
    }
    onWatchAd();
  };

  // When full: the whole card pulses gently via inline style animation
  const cardReadyStyle: CSSProperties = isFull && !showModal
    ? { animation: "card-ready-pulse 1.8s ease-in-out infinite" }
    : {};

  // Progress fill — green = system/progress (unified with Radar)
  const progressFillStyle: CSSProperties = {
    width: `${progressPct}%`,
    transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)",
    background: "linear-gradient(90deg, #00E676 0%, #00c853 100%)",
    borderRadius: "9999px",
    position: "relative",
    height: "100%",
    ...(isProgressShaking
      ? { animation: "progress-liquid-shake 0.4s ease-in-out forwards" }
      : {}),
    boxShadow: isFull
      ? "0 0 16px rgba(0,230,118,0.6), 0 0 24px rgba(0,230,118,0.4)"
      : "0 0 12px rgba(0,230,118,0.5)",
  };

  // Dot segment markers (every 1 ad)
  const segments = Array.from({ length: maxAds - 1 }, (_, i) => ((i + 1) / maxAds) * 100);

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-300 ease-out hover:scale-[1.02] animate-shake-mount"
      style={{
        boxShadow: isFull
          ? "0 0 32px rgba(236,72,153,0.5), 0 0 64px rgba(168,85,247,0.25)"
          : "0 0 24px rgba(236,72,153,0.25)",
        ...cardReadyStyle,
      }}
    >
      {/* Ambient plasma overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-60"
        style={{ background: "radial-gradient(ellipse at 25% 25%, rgba(236,72,153,0.15) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-40"
        style={{ background: "radial-gradient(ellipse at 75% 75%, rgba(168,85,247,0.15) 0%, transparent 65%)" }}
      />

      {/* Header row */}
      <div className="flex items-start gap-3 mb-4 relative z-10">
        {/* Icon container — matches LuckyShakeCard style */}
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-breathing-glow"
          style={{ background: "#0a0a0c", border: "1px solid rgba(236,72,153,0.3)" }}
        >
          {/* plasma rings */}
          <div
            className="absolute inset-0 rounded-2xl opacity-55"
            style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(236,72,153,0.35) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 rounded-2xl opacity-35"
            style={{ background: "radial-gradient(ellipse at 70% 70%, rgba(168,85,247,0.3) 0%, transparent 65%)" }}
          />
          {/* Wireframe play/video SVG */}
          <svg
            viewBox="0 0 40 40"
            width="26"
            height="26"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.7)) drop-shadow(0 0 10px rgba(236,72,153,0.5))", position: "relative", zIndex: 1 }}
          >
            {/* Screen rectangle */}
            <rect x="2" y="6" width="36" height="24" rx="3" />
            {/* Play triangle */}
            <polygon points="15,12 28,18 15,24" strokeWidth="1.2" />
            {/* Bottom stand stem */}
            <line x1="20" y1="30" x2="20" y2="36" strokeWidth="1.4" />
            {/* Stand base */}
            <line x1="12" y1="36" x2="28" y2="36" strokeWidth="1.8" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-white text-base leading-tight tracking-tight">
            Watch Ads
          </h3>
          <p className="text-xs text-white/60 mt-0.5">Earn tickets instantly</p>
          <p className="text-xs font-semibold mt-1 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]">
            Watch 5 videos to earn 1 Ticket
          </p>
        </div>

        {/* Live count badge */}
        <div
          className="shrink-0 flex flex-col items-center justify-center rounded-xl px-3 py-1.5"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(236,72,153,0.25)",
          }}
        >
          <span
            className="font-display font-bold text-white text-lg leading-none tabular-nums"
            style={isFull ? { color: "#ec4899", filter: "drop-shadow(0 0 6px rgba(236,72,153,0.8))" } : {}}
          >
            {watched}
          </span>
          <span className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">/ {maxAds}</span>
        </div>
      </div>

      {/* ── Glass Neon Tube Progress Bar ── */}
      <div className="relative z-10 mb-4">
        {/* Track */}
        <div
          className="relative h-4 rounded-full overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.55)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,255,255,0.05)",
          }}
        >
          {/* Fill (neon liquid) */}
          <div style={progressFillStyle} />

          {/* Glass top-highlight overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 rounded-full"
            style={{
              height: "40%",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)",
              zIndex: 2,
            }}
          />

          {/* Segment tick marks */}
          {segments.map((pct) => (
            <div
              key={pct}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${pct}%`,
                background: "rgba(0,0,0,0.5)",
                zIndex: 3,
              }}
            />
          ))}
        </div>

        {/* Progress label */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Progress</span>
          {isFull ? (
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#ec4899", filter: "drop-shadow(0 0 6px rgba(236,72,153,0.9))" }}
            >
              Ready to earn!
            </span>
          ) : (
            <span className="text-[10px] text-white/50">{maxAds - watched} more to go</span>
          )}
        </div>
      </div>

      {/* ── Watch Ad Button ── */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className="
          relative z-10 w-full py-3.5 rounded-2xl
          font-display font-bold text-sm text-white tracking-wide
          bg-gradient-to-r from-[#ec4899] via-[#c026d3] to-[#7c3aed]
          hover:scale-[1.02]
          active:scale-[0.97]
          disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100
          transition-all duration-200 ease-out
        "
        style={
          !isDisabled
            ? {
                boxShadow: "0 0 24px rgba(236,72,153,0.55), 0 4px 12px rgba(0,0,0,0.4)",
                animation: "unified-pulse 2s ease-in-out infinite",
              }
            : {
                boxShadow: "none",
              }
        }
      >
        {showModal ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Watching...
          </span>
        ) : isFull ? (
          "Daily Limit Reached"
        ) : (
          "Watch Ad"
        )}
      </button>
    </div>
  );
}
