import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, MapPin, ChevronRight, Zap } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useRadar } from "@/contexts/RadarContext";
import { CARD_GLASS } from "@/lib/designTokens";

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
      className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition-all active:scale-[0.98] hover:brightness-110 ${CARD_GLASS}`}
      style={{ border: isRed ? "1px solid rgba(239,68,68,0.25)" : undefined }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-base shrink-0"
          style={{
            background: isRed ? "rgba(239,68,68,0.12)" : "rgba(0,230,118,0.1)",
            border: isRed
              ? "1px solid rgba(239,68,68,0.25)"
              : "1px solid rgba(0,230,118,0.2)",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-white leading-tight">
            {deal.store ?? "Store"}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {formatDist(deal.distanceKm)} · {deal.category}
          </p>
        </div>
      </div>

      {/* Badge: prefer real discount % → Red Label fallback */}
      {deal.discount != null ? (
        <div
          className="shrink-0 rounded-lg px-2.5 py-1"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
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
            background: "rgba(239,68,68,0.12)",
            border: "1.5px dashed rgba(239,68,68,0.4)",
            color: "#ef4444",
            textShadow: "0 0 6px rgba(239,68,68,0.6)",
          }}
        >
          Red Label
        </span>
      ) : (
        <Zap size={14} className="shrink-0 text-[#00E676]" />
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
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0a0f1a] via-[#0d1424] to-[#0a0f1a]" />

      <Header
        onUploadReceipt={handleScanReceipt}
        onShareDiscount={handleScanRedLabel}
      />

      {/* ── Hero ── */}
      <section className="px-4 pt-6 pb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
          Live Deal Radar
        </p>
        <h1 className="font-display text-[2.1rem] font-bold leading-tight text-white text-balance">
          Scan Deals &<br />
          <span style={{ color: "#00E676" }}>Earn Rewards</span>
        </h1>
        <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-[270px]">
          Capture receipts and red-label discounts to earn tickets for the weekly draw.
        </p>

        <button
          onClick={handleScanReceipt}
          className="mt-7 flex items-center justify-center gap-3 rounded-2xl px-8 py-4 font-display font-bold text-[15px] text-[#0a0f1a] transition-all active:scale-[0.97]"
          style={{
            background: "#00E676",
            boxShadow: "0 0 28px rgba(0,230,118,0.45), 0 4px 14px rgba(0,0,0,0.35)",
          }}
        >
          <Camera size={20} strokeWidth={2.5} />
          Scan Now
        </button>
      </section>

      {/* ── Nearby Deals Preview ── */}
      <section className="px-4 pb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">
            Nearby Deals
          </h2>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "#00E676" }}
          >
            View Map <ChevronRight size={14} />
          </button>
        </div>

        {nearbyDeals.length === 0 ? (
          <div className={`rounded-2xl py-8 text-center ${CARD_GLASS}`}>
            <MapPin size={20} className="mx-auto mb-2 text-white/20" />
            <p className="text-sm text-white/35">No deals nearby yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
        <WeeklyRewardCard />
      </section>

      {/* ── FAB ── */}
      <button
        onClick={handleScanReceipt}
        className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full transition-all active:scale-95"
        style={{
          background: "#00E676",
          boxShadow: "0 0 30px rgba(0,230,118,0.5), 0 4px 14px rgba(0,0,0,0.35)",
          animation: "fab-glow-pulse 2s ease-in-out infinite",
        }}
        aria-label="Scan receipt"
      >
        <Camera size={26} className="text-[#0a0f1a]" strokeWidth={2.5} />
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
