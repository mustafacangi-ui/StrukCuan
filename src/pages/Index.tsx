import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Zap } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useBitLabsSurveys, type SurveyDisplay } from "@/hooks/useBitLabsSurveys";

import Header from "@/components/Header";
import WeeklyRewardCard from "@/components/WeeklyRewardCard";
import DailyMissionStreak from "@/components/DailyMissionStreak";
import UserDashboard from "@/components/UserDashboard";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";
import CameraScanner from "@/components/CameraScanner";
import SurveyModal from "@/components/SurveyModal";

type ScannerMode = "receipt" | "red_label" | null;

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isOnboarded, requireLogin } = useUser();
  const { surveys, isLoading } = useBitLabsSurveys(user?.id);
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);
  const [surveyModal, setSurveyModal] = useState<SurveyDisplay | null>(null);

  const openSurvey = (survey: SurveyDisplay) => {
    if (!isOnboarded) {
      requireLogin("profile");
      return;
    }
    setSurveyModal(survey);
  };

  useEffect(() => {
    const state = location.state as { requireLogin?: "camera" | "profile"; openCamera?: boolean } | null;
    if (state?.requireLogin) {
      requireLogin(state.requireLogin);
      navigate("/home", { replace: true });
    }
    if (state?.openCamera) {
      setScannerMode("receipt");
      navigate("/home", { replace: true, state: {} });
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
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff4ecd] via-[#9b5cff] to-[#1a0f3c] bg-fixed" />

      <Header
        onUploadReceipt={handleOpenReceiptScanner}
        onShareDiscount={handleOpenRedLabelScanner}
      />

      <div className="mt-4 space-y-4">
        <WeeklyRewardCard />
        <DailyMissionStreak onOpenScanner={handleOpenReceiptScanner} />

        {/* Surveys — Quick card + BitLabs API list (native card design) */}
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
            {surveys[0] ? (
              <button
                type="button"
                onClick={() => openSurvey(surveys[0])}
                className="group relative overflow-hidden rounded-2xl border border-pink-400/25 bg-pink-500/10 bg-gradient-to-br from-pink-500/15 via-pink-500/5 to-violet-500/10 p-4 text-left backdrop-blur-xl transition-all hover:border-pink-400/50 hover:shadow-[0_0_24px_rgba(236,72,153,0.25)] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                <div className="absolute right-2 top-2 rounded-full border border-emerald-500/30 bg-emerald-500/30 px-2 py-0.5 backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-emerald-700">+{surveys[0].rewardCuan}</span>
                </div>
                <div className="relative">
                  <p className="font-display font-bold text-slate-800">BitLabs Survey</p>
                  <p className="mt-1 text-[10px] text-slate-600">{surveys[0].durationMin} menit</p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-700 backdrop-blur-sm">
                    +{surveys[0].rewardCuan} Cuan
                  </p>
                </div>
              </button>
            ) : (
              <div className="rounded-2xl border border-white/20 bg-white/5 p-4 opacity-60">
                <p className="font-display font-bold text-slate-600">BitLabs Survey</p>
                <p className="mt-1 text-[10px] text-slate-500">Survei sedang dimuat...</p>
              </div>
            )}
          </div>

          {/* Partner Tasks — BitLabs API list, native card design (icon | title | Mulai) */}
          <div className="mt-3 flex flex-col gap-2">
            {isLoading ? (
              <div className="glass rounded-xl p-4 border border-white/20 text-center text-white/60 text-sm">
                Memuat survei...
              </div>
            ) : surveys.length === 0 ? (
              <div className="glass rounded-xl p-4 border border-white/20 text-center">
                <p className="text-white/80 text-sm font-medium">Survei tidak tersedia saat ini</p>
                <p className="text-white/50 text-xs mt-1">Silakan coba lagi nanti.</p>
              </div>
            ) : (
              surveys.map((survey) => (
                <div
                  key={survey.id}
                  className="glass rounded-xl p-3 border border-white/20 flex items-center gap-3"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-theme-purple/30 border border-white/20 flex items-center justify-center">
                    <ClipboardList size={18} className="text-theme-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-semibold text-[#FFFFFF] text-sm block truncate">
                      {survey.title || "BitLabs Survey"}
                    </span>
                    <span className="text-[11px] text-white/60">
                      +{survey.rewardCuan} Cuan · {survey.durationMin} menit
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSurvey(survey)}
                    className="shrink-0 px-4 py-2 rounded-full font-display font-bold text-xs bg-theme-green text-[#001a09] shadow-[0_0_12px_rgba(0,230,118,0.5)] hover:scale-105 active:scale-95 transition-transform"
                  >
                    Mulai
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <UserDashboard />
        <LeaderboardPreview />
      </div>

      <LegalFooter />
      <LoginSheet />
      <BottomNav />

      {scannerMode && (
        <CameraScanner mode={scannerMode} onClose={() => setScannerMode(null)} />
      )}

      {surveyModal && (
        <SurveyModal
          clickUrl={surveyModal.clickUrl}
          onClose={() => setSurveyModal(null)}
          userId={user?.id}
        />
      )}
    </div>
  );
};

export default Index;
