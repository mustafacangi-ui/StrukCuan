import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Zap, Star, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

import Header from "@/components/Header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WeeklyRewardCard from "@/components/WeeklyRewardCard";
import DailyMissionStreak from "@/components/DailyMissionStreak";
import UserDashboard from "@/components/UserDashboard";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";
import CameraScanner from "@/components/CameraScanner";

type ScannerMode = "receipt" | "red_label" | null;

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnboarded, requireLogin } = useUser();
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

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
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#db2777] via-[#c026d3] to-[#7c3aed]" />

      <Header
        onUploadReceipt={handleOpenReceiptScanner}
        onShareDiscount={handleOpenRedLabelScanner}
      />

      <div className="mt-4 space-y-4">
        {/* Weekly Reward Card */}
        <WeeklyRewardCard />

        {/* Daily Mission & Streak */}
        <DailyMissionStreak onOpenScanner={handleOpenReceiptScanner} />

        {/* Surveys — Glassmorphism cards */}
        <section className="mx-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/90 mb-3 flex items-center gap-2">
            <ClipboardList size={14} />
            {t("surveys")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setComingSoonOpen(true)}
              className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 bg-gradient-to-br from-white/40 to-white/20 p-4 text-left backdrop-blur-xl transition-all hover:border-white/60 hover:shadow-lg active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/30 px-2 py-0.5 backdrop-blur-sm">
                <Zap size={12} className="inline text-emerald-600" />
              </div>
              <div className="relative">
                <p className="font-display font-bold text-slate-800">Quick Survey</p>
                <p className="mt-1 text-[10px] text-slate-600">1-3 dakika</p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-700 backdrop-blur-sm">
                  +10 Cuan
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setComingSoonOpen(true)}
              className="group relative overflow-hidden rounded-2xl border border-pink-400/25 bg-pink-500/10 bg-gradient-to-br from-pink-500/15 via-pink-500/5 to-violet-500/10 p-4 text-left backdrop-blur-xl transition-all hover:border-pink-400/50 hover:shadow-[0_0_24px_rgba(236,72,153,0.25)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/30 px-2 py-0.5 backdrop-blur-sm">
                <Star size={12} className="inline text-emerald-600" />
              </div>
              <div className="relative">
                <p className="font-display font-bold text-slate-800">Pro Survey</p>
                <p className="mt-1 text-[10px] text-slate-600">10-15 dakika</p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-700 backdrop-blur-sm">
                  +150 Cuan
                </p>
              </div>
            </button>
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

      {/* Coming Soon — Premium glassmorphism modal */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-[340px] overflow-hidden rounded-2xl border border-white/40 bg-white/95 backdrop-blur-2xl p-0 shadow-xl">
          <div className="relative p-6 pb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20 backdrop-blur-sm">
              <Sparkles size={28} className="text-emerald-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center font-display text-xl font-bold text-slate-800">
                Çok Yakında
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-slate-600">
                Anketler şu anda hazırlanıyor. Kısa süre içinde Cuan kazanmaya başlayabilirsiniz.
              </DialogDescription>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
