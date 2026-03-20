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
      className="w-full flex items-center justify-between rounded-2xl p-3.5 text-left transition-all active:scale-[0.97]"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: isRed
          ? "1px solid rgba(239,68,68,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isRed
          ? "0 4px 24px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = isRed
          ? "0 8px 32px rgba(239,68,68,0.14), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.07)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = isRed
          ? "0 4px 24px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)";
      }}
    >
      <div className="flex items-center gap-3">
        {/* Category icon */}
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-lg shrink-0"
          style={{
            background: isRed
              ? "rgba(239,68,68,0.1)"
              : "rgba(0,230,118,0.08)",
            border: isRed
              ? "1px solid rgba(239,68,68,0.2)"
              : "1px solid rgba(0,230,118,0.18)",
            boxShadow: isRed
              ? "0 0 12px rgba(239,68,68,0.1)"
              : "0 0 10px rgba(0,230,118,0.08)",
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-white leading-tight">
            {deal.store ?? "Store"}
          </p>
          <p className="text-[11px] text-white/45 mt-0.5">
            {formatDist(deal.distanceKm)} · {deal.category}
          </p>
        </div>
      </div>

      {/* Badge */}
      {deal.discount != null ? (
        <div
          className="shrink-0 rounded-lg px-2.5 py-1"
          style={{
            background: "rgba(239,68,68,0.13)",
            border: "1px solid rgba(239,68,68,0.28)",
            boxShadow: "0 0 10px rgba(239,68,68,0.12)",
          }}
        >
          <span className="font-display font-bold text-sm text-red-400">
            -{deal.discount}%
          </span>
        </div>
      ) : isRed ? (
        <span
          className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1.5px dashed rgba(239,68,68,0.38)",
            color: "#ef4444",
            textShadow: "0 0 8px rgba(239,68,68,0.6)",
            boxShadow: "0 0 10px rgba(239,68,68,0.1)",
          }}
        >
          Red Label
        </span>
      ) : (
        <Zap size={14} className="shrink-0" style={{ color: "#00E676" }} />
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

      {/* ── Background: layered radial glows ── */}
      <div className="fixed inset-0 -z-10" style={{ background: "#07090f" }} />
      {/* Large green halo top-left — hero glow */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 75% 45% at 15% 5%, rgba(0,230,118,0.09) 0%, transparent 65%)",
        }}
      />
      {/* Softer green mid-right depth layer */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 55% 35% at 85% 45%, rgba(0,230,118,0.04) 0%, transparent 55%)",
        }}
      />
      {/* Violet accent bottom */}
      <div
        className="fixed -z-10 pointer-events-none"
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 30% at 50% 95%, rgba(124,58,237,0.06) 0%, transparent 60%)",
        }}
      />

      <Header
        onUploadReceipt={handleScanReceipt}
        onShareDiscount={handleScanRedLabel}
      />

      {/* ── Hero ── */}
      <section className="relative px-4 pt-6 pb-8 overflow-hidden">
        {/* Decorative radar rings behind the text */}
        <div
          className="pointer-events-none absolute -right-8 -top-6 h-52 w-52 rounded-full opacity-[0.06]"
          style={{
            border: "1px solid #00E676",
            animation: "radar-ring-expand 3s ease-out 0s infinite",
          }}
        />
        <div
          className="pointer-events-none absolute -right-8 -top-6 h-52 w-52 rounded-full opacity-[0.04]"
          style={{
            border: "1px solid #00E676",
            animation: "radar-ring-expand 3s ease-out 1.5s infinite",
          }}
        />

        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: "#00E676",
              boxShadow: "0 0 6px rgba(0,230,118,0.9)",
              animation: "live-dot 1.5s ease-in-out infinite",
              display: "inline-block",
            }}
          />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
            Live Deal Radar
          </p>
        </div>

        {/* Headline */}
        <h1 className="font-display text-[2.15rem] font-bold leading-tight text-white text-balance">
          Scan Deals &<br />
          <span
            style={{
              color: "#00E676",
              textShadow: "0 0 28px rgba(0,230,118,0.5), 0 0 60px rgba(0,230,118,0.2)",
            }}
          >
            Earn Rewards
          </span>
        </h1>
        <p className="mt-3 text-[13px] text-white/50 leading-relaxed max-w-[265px]">
          Capture receipts and red-label discounts to earn tickets for the weekly draw.
        </p>

        {/* Scan Now button — premium full-width */}
        <button
          onClick={handleScanReceipt}
          className="relative mt-7 w-full overflow-hidden rounded-2xl py-5 font-display font-bold text-[16px] text-[#07090f] transition-all active:scale-[0.97] flex items-center justify-center gap-3"
          style={{
            background: "linear-gradient(135deg, #00E676 0%, #00c853 100%)",
            boxShadow:
              "0 0 32px rgba(0,230,118,0.55), 0 0 64px rgba(0,230,118,0.2), 0 8px 24px rgba(0,0,0,0.4)",
            animation: "fab-glow-pulse 2s ease-in-out infinite",
          }}
        >
          {/* Inner shimmer sweep */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
              animation: "scan-sweep 3s linear infinite",
            }}
          />
          <ScanLine size={20} strokeWidth={2.5} />
          Scan Now
        </button>
      </section>

      {/* ── Nearby Deals Preview ── */}
      <section className="px-4 pb-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span
              className="block h-3.5 w-0.5 rounded-full"
              style={{
                background: "#00E676",
                boxShadow: "0 0 6px rgba(0,230,118,0.7)",
              }}
            />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/50">
              Nearby Deals
            </h2>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "#00E676" }}
          >
            View Map <ChevronRight size={13} />
          </button>
        </div>

        {nearbyDeals.length === 0 ? (
          <div
            className="rounded-2xl py-10 text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            <MapPin size={22} className="mx-auto mb-2 text-white/15" />
            <p className="text-sm text-white/30">No deals nearby yet</p>
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
      <section className="px-4 pb-4">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="block h-3.5 w-0.5 rounded-full"
            style={{
              background: "#ec4899",
              boxShadow: "0 0 6px rgba(236,72,153,0.7)",
            }}
          />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/50">
            Weekly Reward
          </h2>
        </div>
        <WeeklyRewardCard />
      </section>

      {/* ── FAB ── */}
      <button
        onClick={handleScanReceipt}
        className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #00E676 0%, #00c853 100%)",
          boxShadow:
            "0 0 32px rgba(0,230,118,0.6), 0 0 64px rgba(0,230,118,0.25), 0 4px 14px rgba(0,0,0,0.4)",
          animation: "fab-glow-pulse 2s ease-in-out infinite",
        }}
        aria-label="Scan receipt"
      >
        {/* Outer animated ring */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "1.5px solid rgba(0,230,118,0.4)",
            animation: "radar-ring-expand 2s ease-out infinite",
          }}
        />
        <Camera size={26} className="relative z-10 text-[#07090f]" strokeWidth={2.5} />
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
