import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Zap, Star } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

import Header from "@/components/Header";
import WeeklyRewardCard from "@/components/WeeklyRewardCard";
import DailyMissionStreak from "@/components/DailyMissionStreak";
import UserDashboard from "@/components/UserDashboard";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";
import CameraScanner from "@/components/CameraScanner";

type ScannerMode = "receipt" | "red_label" | null;

const BITLABS_TOKEN = import.meta.env.VITE_BITLABS_TOKEN ?? "757953d0";
const BITLABS_URL = `https://web.bitlabs.ai?token=${BITLABS_TOKEN}`;

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isOnboarded, requireLogin } = useUser();
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);

  const openBitLabs = () => {
    if (!isOnboarded) {
      requireLogin("profile");
      return;
    }
    window.open(BITLABS_URL, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const state = location.state as { requireLogin?: "camera" | "profile"; openCamera?: boolean } | null;
    if (state?.requireLogin) {
      requireLogin(state.requireLogin);
      navigate("/", { replace: true });
    }
    if (state?.openCamera) {
      setScannerMode("receipt");
      navigate("/", { replace: true, state: {} });
    }
  }, [location.state, requireLogin, navigate]);

  const handleOpenReceiptScanner = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setScannerMode("receipt");
  };

  const handleOpenRedLabelScanner = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setScannerMode("red_label");
  };

  return (
    <div className="min-h-screen pb-28 w-full max-w-[420px] mx-auto">
      {/* Radar theme: deep navy background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff4ecd] via-[#9b5cff] to-[#1a0f3c] bg-fixed" />

      <Header
        onUploadReceipt={handleOpenReceiptScanner}
        onShareDiscount={handleOpenRedLabelScanner}
      />

      <div className="mt-4 space-y-4">
        {/* Weekly Reward Card */}
        <WeeklyRewardCard />

        {/* Daily Mission & Streak */}
        <DailyMissionStreak onOpenScanner={handleOpenReceiptScanner} />

        {/* Surveys — Quick & Pro cards (yan yana) + Partner Tasks */}
        <section className="mx-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/90 mb-3 flex items-center gap-2">
            <ClipboardList size={14} />
            {t("surveys")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate("/surveys")}
              className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 bg-gradient-to-br from-white/40 to-white/20 p-4 text-left backdrop-blur-xl transition-all hover:border-white/60 hover:shadow-lg active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/30 px-2 py-0.5 backdrop-blur-sm">
                <Zap size={12} className="inline text-emerald-600" />
              </div>
              <div className="relative">
                <p className="font-display font-bold text-slate-800">Quick Survey</p>
                <p className="mt-1 text-[10px] text-slate-600">1-3 menit</p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-700 backdrop-blur-sm">
                  +10 Cuan
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={openBitLabs}
              className="group relative overflow-hidden rounded-2xl border border-pink-400/25 bg-pink-500/10 bg-gradient-to-br from-pink-500/15 via-pink-500/5 to-violet-500/10 p-4 text-left backdrop-blur-xl transition-all hover:border-pink-400/50 hover:shadow-[0_0_24px_rgba(236,72,153,0.25)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/30 px-2 py-0.5 backdrop-blur-sm">
                <Star size={12} className="inline text-emerald-600" />
              </div>
              <div className="relative">
                <p className="font-display font-bold text-slate-800">Pro Survey</p>
                <p className="mt-1 text-[10px] text-slate-600">10-15 menit</p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-700 backdrop-blur-sm">
                  +150 Cuan
                </p>
              </div>
            </button>
          </div>

          {/* Partner Tasks — Receipt Hog style: icon left, title middle, Mulai right */}
          <div className="mt-3 flex flex-col gap-2">
            <div className="glass rounded-xl p-3 border border-white/20 flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-theme-purple/30 border border-white/20 flex items-center justify-center">
                <ClipboardList size={18} className="text-theme-green" />
              </div>
              <span className="flex-1 font-display font-semibold text-[#FFFFFF] text-sm">
                BitLabs Survey
              </span>
              <button
                type="button"
                onClick={openBitLabs}
                className="shrink-0 px-4 py-2 rounded-full font-display font-bold text-xs bg-theme-green text-[#001a09] shadow-[0_0_12px_rgba(0,230,118,0.5)] hover:scale-105 active:scale-95 transition-transform"
              >
                Mulai
              </button>
            </div>
          </div>
        </section>

        {/* Section 5 — Level Progress */}
        {/* Section 6 — History */}
        <UserDashboard />

        <LeaderboardPreview />
      </div>

      <LegalFooter />
      <LoginSheet />
      <BottomNav />

      {scannerMode && (
        <CameraScanner
          mode={scannerMode}
          onClose={() => setScannerMode(null)}
        />
      )}
    </div>
  );
};

export default Index;
