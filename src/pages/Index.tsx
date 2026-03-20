import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, MapPin, ChevronRight, Zap, ScanLine } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useRadar } from "@/contexts/RadarContext";

import Header from "@/components/Header";
import WeeklyRewardCard from "@/components/WeeklyRewardCard";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";
import CameraScanner from "@/components/CameraScanner";

type ScannerMode = "receipt" | "red_label" | null;

const CATEGORY_ICON: Record<string, string> = {
  Market: "🛒",
  Cafe: "☕",
  Electronics: "⚡",
  Fashion: "👗",
};

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ─── Nearby Deal Row ──────────────────────────────────────────────────────────

function NearbyDealRow({
  deal,
  onClick,
}: {
  deal: ReturnType<typeof useRadar>["deals"][0];
  onClick: () => void;
}) {
  const icon = CATEGORY_ICON[deal.category] ?? "🏪";
  const isRed = deal.isRedLabel;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-2xl p-3.5 text-left transition-all duration-200 active:scale-[0.97]"
      style={{
        background: isRed
          ? "rgba(239,68,68,0.05)"
          : "rgba(255,255,255,0.032)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: isRed
          ? "1px solid rgba(239,68,68,0.2)"
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isRed
          ? "0 2px 16px rgba(239,68,68,0.07), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.15)"
          : "0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.15)",
      }}
      onPointerEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = isRed ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.055)";
        el.style.boxShadow = isRed
          ? "0 6px 28px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(239,68,68,0.12)"
          : "0 6px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.07)";
      }}
      onPointerLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = isRed ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.032)";
        el.style.boxShadow = isRed
          ? "0 2px 16px rgba(239,68,68,0.07), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.15)"
          : "0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.15)";
      }}
    >
      {/* Icon */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[17px] shrink-0"
          style={{
            background: isRed
              ? "rgba(239,68,68,0.1)"
              : "rgba(0,230,118,0.08)",
            border: isRed
              ? "1px solid rgba(239,68,68,0.18)"
              : "1px solid rgba(0,230,118,0.15)",
            boxShadow: isRed
              ? "0 0 12px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.08)"
              : "0 0 10px rgba(0,230,118,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-display font-semibold text-[13.5px] text-white leading-tight">
            {deal.store ?? "Store"}
          </p>
          <p className="text-[11px] text-white/40 mt-0.5 leading-tight">
            {formatDist(deal.distanceKm)} · {deal.category}
          </p>
        </div>
      </div>

      {/* Badge */}
      {deal.discount != null ? (
        <div
          className="shrink-0 rounded-lg px-2.5 py-1.5 ml-2"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            boxShadow: "0 0 10px rgba(239,68,68,0.1)",
          }}
        >
          <span
            className="font-display font-bold text-[13px] text-red-400"
            style={{ textShadow: "0 0 10px rgba(239,68,68,0.5)" }}
          >
            -{deal.discount}%
          </span>
        </div>
      ) : isRed ? (
        <span
          className="shrink-0 rounded-lg px-2.5 py-1.5 ml-2 text-[11px] font-bold"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1.5px dashed rgba(239,68,68,0.35)",
            color: "#ef4444",
            textShadow: "0 0 8px rgba(239,68,68,0.6)",
          }}
        >
          Red Label
        </span>
      ) : (
        <Zap size={14} className="shrink-0 ml-2" style={{ color: "#00E676" }} />
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isOnboarded, requireLogin } = useUser();
  const { deals } = useRadar();
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);

  // Top 3 closest deals
  const nearbyDeals = [...deals]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  // Handle deep-link navigation state (from other screens)
  useEffect(() => {
    const state = location.state as {
      requireLogin?: "camera" | "profile";
      openCamera?: boolean;
    } | null;
    if (state?.requireLogin) {
      requireLogin(state.requireLogin);
      navigate("/home", { replace: true });
    }
    if (state?.openCamera) {
      setScannerMode("receipt");
      navigate("/home", { replace: true, state: {} });
    }
  }, [location.state, requireLogin, navigate]);

  const handleScanReceipt = () => {
    if (!isOnboarded) { requireLogin("camera"); return; }
    setScannerMode("receipt");
  };

  const handleScanRedLabel = () => {
    if (!isOnboarded) { requireLogin("camera"); return; }
    setScannerMode("red_label");
  };

  return (
    <div className="min-h-screen pb-28 w-full max-w-[420px] mx-auto">

      {/* ── Background: 5-layer depth field ── */}
      {/* Base */}
      <div className="fixed inset-0 -z-10" style={{ background: "#06080f" }} />
      {/* Hero green halo — top-center, large and soft */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 110% 55% at 50% -8%, rgba(0,230,118,0.13) 0%, transparent 60%)",
        }}
      />
      {/* Top-left corner accent */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 35% at -8% 18%, rgba(0,230,118,0.07) 0%, transparent 55%)",
        }}
      />
      {/* Right-side mid ambient */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 40% 28% at 108% 38%, rgba(0,230,118,0.04) 0%, transparent 55%)",
        }}
      />
      {/* Bottom purple tint */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 85% 38% at 50% 108%, rgba(88,28,235,0.1) 0%, transparent 55%)",
        }}
      />

      <Header
        onUploadReceipt={handleScanReceipt}
        onShareDiscount={handleScanRedLabel}
        hideCuan
      />

      {/* ── Hero ── */}
      <section className="relative px-4 pt-7 pb-9 overflow-hidden">
        {/* Animated ambient orb behind the hero text */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-56 rounded-full -z-10"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,230,118,0.09) 0%, transparent 70%)",
            animation: "hero-pulse 4s ease-in-out infinite",
            filter: "blur(20px)",
          }}
          aria-hidden
        />

        {/* Decorative radar rings (top-right) */}
        <div
          className="pointer-events-none absolute -right-10 -top-8 h-56 w-56 rounded-full -z-10"
          style={{
            border: "1px solid rgba(0,230,118,0.07)",
            animation: "radar-ring-expand 3.5s ease-out 0s infinite",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-8 h-56 w-56 rounded-full -z-10"
          style={{
            border: "1px solid rgba(0,230,118,0.04)",
            animation: "radar-ring-expand 3.5s ease-out 1.75s infinite",
          }}
          aria-hidden
        />

        {/* Live Deal Radar label */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="h-[7px] w-[7px] rounded-full shrink-0"
            style={{
              background: "#00E676",
              boxShadow: "0 0 8px rgba(0,230,118,1), 0 0 16px rgba(0,230,118,0.5)",
              animation: "live-dot 1.5s ease-in-out infinite",
              display: "inline-block",
            }}
            aria-hidden
          />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "rgba(0,230,118,0.65)" }}
          >
            Live Deal Radar
          </p>
        </div>

        {/* Headline */}
        <h1 className="font-display leading-[1.1] text-white text-balance"
          style={{ fontSize: "clamp(2rem, 8vw, 2.3rem)", fontWeight: 800 }}
        >
          Scan Deals &<br />
          <span
            style={{
              color: "#00E676",
              textShadow:
                "0 0 24px rgba(0,230,118,0.7), 0 0 48px rgba(0,230,118,0.35), 0 0 96px rgba(0,230,118,0.12)",
            }}
          >
            Earn Rewards
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 text-[13px] leading-relaxed max-w-[258px]"
          style={{ color: "rgba(255,255,255,0.48)" }}
        >
          Capture receipts and red-label discounts to earn tickets for the weekly draw.
        </p>

        {/* ── Scan Now — primary CTA ── */}
        <button
          onClick={handleScanReceipt}
          className="relative mt-8 w-full overflow-hidden rounded-[18px] py-[18px] font-display font-extrabold text-[16px] tracking-wide text-[#06080f] transition-transform active:scale-[0.97] flex items-center justify-center gap-3"
          style={{
            background: "linear-gradient(155deg, #00E676 0%, #00d664 45%, #00c853 100%)",
            boxShadow:
              "0 0 36px rgba(0,230,118,0.55), 0 0 72px rgba(0,230,118,0.2), 0 0 120px rgba(0,230,118,0.08), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.1)",
            animation: "scan-btn-pulse 2.5s ease-in-out infinite",
          }}
        >
          {/* Left-to-right shimmer sweep */}
          <span
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]"
            aria-hidden
          >
            <span
              className="absolute top-0 bottom-0 w-[45%]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
                animation: "shimmer-ltr 2.4s ease-in-out infinite",
              }}
            />
          </span>

          <ScanLine size={21} strokeWidth={2.5} className="relative z-10" />
          <span className="relative z-10">Scan Now</span>
        </button>
      </section>

      {/* ── Nearby Deals ── */}
      <section className="px-4 pb-7">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="block h-[14px] w-[3px] rounded-full"
              style={{
                background: "linear-gradient(to bottom, #00E676, #00c853)",
                boxShadow: "0 0 8px rgba(0,230,118,0.75)",
              }}
            />
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Nearby Deals
            </h2>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-[11.5px] font-semibold"
            style={{ color: "#00E676" }}
          >
            View Map <ChevronRight size={13} />
          </button>
        </div>

        {nearbyDeals.length === 0 ? (
          <div
            className="rounded-2xl py-10 text-center"
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <MapPin size={22} className="mx-auto mb-2.5" style={{ color: "rgba(255,255,255,0.12)" }} />
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              No deals nearby yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {nearbyDeals.map((deal) => (
              <NearbyDealRow
                key={deal.id}
                deal={deal}
                onClick={() => navigate("/")}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Weekly Reward ── */}
      <section className="px-4 pb-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="block h-[14px] w-[3px] rounded-full"
            style={{
              background: "linear-gradient(to bottom, #ec4899, #c026d3)",
              boxShadow: "0 0 8px rgba(236,72,153,0.75)",
            }}
          />
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Weekly Reward
          </h2>
        </div>
        <WeeklyRewardCard />
      </section>

      {/* ── FAB ── */}
      <button
        onClick={handleScanReceipt}
        className="fixed bottom-24 right-4 z-50 flex h-[62px] w-[62px] items-center justify-center rounded-full transition-transform active:scale-95"
        style={{
          background: "linear-gradient(145deg, #00E676 0%, #00c853 100%)",
          boxShadow:
            "0 0 36px rgba(0,230,118,0.7), 0 0 72px rgba(0,230,118,0.3), 0 0 120px rgba(0,230,118,0.1), 0 4px 20px rgba(0,0,0,0.5)",
          animation: "fab-glow-pulse 2s ease-in-out infinite",
        }}
        aria-label="Scan receipt"
      >
        {/* Expanding radar ring 1 */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "1.5px solid rgba(0,230,118,0.45)",
            animation: "radar-ring-expand 2s ease-out 0s infinite",
          }}
          aria-hidden
        />
        {/* Expanding radar ring 2 */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "1px solid rgba(0,230,118,0.2)",
            animation: "radar-ring-expand 2s ease-out 1s infinite",
          }}
          aria-hidden
        />
        <Camera
          size={25}
          className="relative z-10"
          style={{ color: "#06080f" }}
          strokeWidth={2.5}
        />
      </button>

      <LegalFooter />
      <LoginSheet />
      <BottomNav />

      {scannerMode && (
        <CameraScanner mode={scannerMode} onClose={() => setScannerMode(null)} />
      )}
    </div>
  );
};

export default Index;
