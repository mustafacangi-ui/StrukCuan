import { useState } from "react";
import type { CSSProperties } from "react";
import type { SurveyDisplay } from "@/hooks/useBitLabsSurveys";

interface SurveysCardProps {
  surveys: SurveyDisplay[];
  isLoading: boolean;
  onSelect: (survey: SurveyDisplay) => void;
}

export default function SurveysCard({ surveys, isLoading, onSelect }: SurveysCardProps) {
  const [goldenShaking, setGoldenShaking] = useState(false);

  const triggerGoldenShake = () => {
    setGoldenShaking(true);
    setTimeout(() => setGoldenShaking(false), 580);
  };

  const handleStart = (survey: SurveyDisplay, isFeatured: boolean) => {
    if (isFeatured) triggerGoldenShake();
    onSelect(survey);
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 shadow-2xl animate-shake-mount"
      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.2)" }}
    >
      {/* Ambient overlays */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-40"
        style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.15) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-30"
        style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.12) 0%, transparent 65%)" }}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-5 relative z-10">
        {/* Icon container */}
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-breathing-glow"
          style={{ background: "#0a0a0c", border: "1px solid rgba(168,85,247,0.3)" }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-50"
            style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(168,85,247,0.35) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 rounded-2xl opacity-35"
            style={{ background: "radial-gradient(ellipse at 70% 70%, rgba(236,72,153,0.25) 0%, transparent 65%)" }}
          />
          {/* Clipboard wireframe SVG */}
          <svg
            viewBox="0 0 36 44"
            width="24"
            height="24"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.7)) drop-shadow(0 0 10px rgba(168,85,247,0.5))", position: "relative", zIndex: 1 }}
          >
            {/* Clipboard body */}
            <rect x="2" y="6" width="32" height="36" rx="3" />
            {/* Clip at top */}
            <path d="M12 2 Q18 0 24 2 L24 8 Q18 6 12 8 Z" />
            {/* Lines */}
            <line x1="8" y1="17" x2="28" y2="17" strokeWidth="1.2" />
            <line x1="8" y1="23" x2="28" y2="23" strokeWidth="1.2" />
            <line x1="8" y1="29" x2="20" y2="29" strokeWidth="1.2" />
            {/* Check mark */}
            <polyline points="22,27 25,31 30,25" strokeWidth="1.8" stroke="rgba(74,222,128,0.9)" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-white text-base leading-tight tracking-tight">
            Complete Surveys
          </h3>
          <p className="text-xs text-white/60 mt-0.5">Earn tickets directly</p>
          <p className="text-xs font-semibold mt-1 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]">
            Up to 2 tickets per survey
          </p>
        </div>
      </div>

      {/* Survey list */}
      <div className="relative z-10 space-y-3">
        {isLoading ? (
          <div className="flex flex-col gap-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-white/40">No surveys available right now.</p>
            <p className="text-xs text-white/25 mt-1">Check back later!</p>
          </div>
        ) : (
          surveys.map((survey, index) => {
            const isFeatured = index === 0;
            return isFeatured ? (
              <GoldenSurveyRow
                key={survey.id}
                survey={survey}
                isShaking={goldenShaking}
                onStart={() => handleStart(survey, true)}
              />
            ) : (
              <StandardSurveyRow
                key={survey.id}
                survey={survey}
                onStart={() => handleStart(survey, false)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Golden Ticket (Featured) Row
────────────────────────────────────────────── */
function GoldenSurveyRow({
  survey,
  isShaking,
  onStart,
}: {
  survey: SurveyDisplay;
  isShaking: boolean;
  onStart: () => void;
}) {
  const shakeStyle: CSSProperties = isShaking
    ? { animation: "card-shake 0.55s ease-in-out forwards" }
    : {};

  return (
    <div
      className="relative rounded-2xl p-4 flex items-center gap-3 transition-all duration-250 hover:scale-[1.02]"
      style={{
        background: "rgba(10,8,2,0.75)",
        border: "1px solid rgba(251,191,36,0.35)",
        backdropFilter: "blur(16px)",
        animation: isShaking ? "card-shake 0.55s ease-in-out forwards" : "gold-breathing-glow 3s ease-in-out infinite",
        ...(!isShaking && {}),
      }}
    >
      {/* BEST OFFER badge */}
      <span
        className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wide"
        style={{
          background: "rgba(251,191,36,0.15)",
          border: "1px solid rgba(251,191,36,0.4)",
          color: "#fbbf24",
          textShadow: "0 0 8px rgba(251,191,36,0.6)",
        }}
      >
        🔥 Best Offer
      </span>

      {/* Icon */}
      <div
        className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "#0a0a0c",
          border: "1px solid rgba(251,191,36,0.35)",
          boxShadow: "0 0 12px rgba(251,191,36,0.4), inset 0 0 8px rgba(251,191,36,0.06)",
        }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-60"
          style={{ background: "radial-gradient(ellipse at center, rgba(251,191,36,0.25) 0%, transparent 70%)" }}
        />
        <span className="text-xl relative z-10" style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.8))" }}>
          📋
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pr-20">
        <h4 className="font-display font-bold text-white text-sm leading-tight truncate">
          {survey.title || "BitLabs Survey"}
        </h4>
        <p
          className="text-sm font-bold mt-1"
          style={{ color: "#fbbf24", textShadow: "0 0 10px rgba(251,191,36,0.7)" }}
        >
          🎟️ 2 TICKETS
        </p>
      </div>

      {/* Golden START button */}
      <button
        type="button"
        onClick={onStart}
        className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 px-4 py-2 rounded-xl font-display font-bold text-xs text-[#1a0d00] transition-all duration-200 hover:scale-[1.05] active:scale-[0.96]"
        style={{
          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
          animation: "gold-pulse-btn 1.6s ease-in-out infinite",
        }}
      >
        START
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Standard Survey Row
────────────────────────────────────────────── */
function StandardSurveyRow({
  survey,
  onStart,
}: {
  survey: SurveyDisplay;
  onStart: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-2xl p-4 flex items-center gap-3 transition-all duration-200"
      style={{
        background: "rgba(10,8,14,0.65)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(14px)",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        boxShadow: hovered
          ? "0 0 20px rgba(168,85,247,0.35), 0 4px 16px rgba(0,0,0,0.4)"
          : "0 0 0 transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "#0a0a0c",
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow: "0 0 10px rgba(168,85,247,0.3)",
          transition: "box-shadow 0.2s",
        }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-40"
          style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, transparent 70%)" }}
        />
        <span className="text-xl relative z-10" style={{ filter: "drop-shadow(0 0 5px rgba(168,85,247,0.6))" }}>
          📋
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pr-20">
        <h4 className="font-display font-bold text-white text-sm leading-tight truncate">
          {survey.title || "BitLabs Survey"}
        </h4>
        <p
          className="text-sm font-bold mt-1 text-[#4ade80]"
          style={{ textShadow: "0 0 8px rgba(74,222,128,0.6)" }}
        >
          🎟️ 1 TICKET
        </p>
      </div>

      {/* Magenta START button */}
      <button
        type="button"
        onClick={onStart}
        className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 px-4 py-2 rounded-xl font-display font-bold text-xs text-white transition-all duration-200 hover:scale-[1.06] active:scale-[0.96]"
        style={{
          background: "linear-gradient(135deg, #ec4899 0%, #c026d3 50%, #7c3aed 100%)",
          boxShadow: "0 0 14px rgba(236,72,153,0.5), 0 3px 8px rgba(0,0,0,0.35)",
        }}
      >
        START
      </button>
    </div>
  );
}
