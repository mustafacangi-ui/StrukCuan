import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, ChevronRight, Coins, ListTodo } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { startSurvey } from "@/lib/survey";
import { useUserStats } from "@/hooks/useUserStats";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

/** Survey item for list */
interface SurveyItem {
  id: string;
  title: string;
  durationMin: number;
  rewardCuan: number;
  isPremiumPartner?: boolean;
  partnerName?: string;
}

const BITLABS_SURVEY: SurveyItem = {
  id: "bitlabs-intro",
  title: "Survei Pengantar BitLabs",
  durationMin: 5,
  rewardCuan: 150,
  isPremiumPartner: true,
  partnerName: "BitLabs",
};

const TUGAS_LOKAL: SurveyItem[] = [
  { id: "interest-1", title: "Survei Minat 1", durationMin: 2, rewardCuan: 10 },
  { id: "interest-2", title: "Survei Minat 2", durationMin: 3, rewardCuan: 15 },
  { id: "interest-3", title: "Survei Minat 3", durationMin: 2, rewardCuan: 10 },
];

/**
 * Surveys page - Receipt Hog layout, StrukCuan deep purple + neon green theme.
 * Pusat Survei, user status bar, BitLabs premium card, Tugas Lokal list.
 */
export default function Surveys() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const countryCode = user?.countryCode ?? "ID";
  const totalPoin = stats?.cuan ?? 0;
  const tugasCount = TUGAS_LOKAL.length + 1; // BitLabs + local tasks

  const handleBitLabsClick = () => {
    toast.info(t("surveys.verifyingAccount"), {
      description: t("surveys.tryAgainLater"),
    });
  };

  const handleStartSurvey = (surveyId: string) => {
    if (!isOnboarded) {
      requireLogin("profile");
      return;
    }
    startSurvey(countryCode, user?.id);
  };

  const handleShowHistory = () => {
    if (!isOnboarded) {
      requireLogin("profile");
      return;
    }
    navigate("/cuan");
  };

  return (
    <div className="min-h-screen max-w-[430px] mx-auto flex flex-col pb-24">
      {/* Deep purple/navy background - image_03a8bf style */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#1a0f3c] via-[#1a0f3c] to-[#0d0620] bg-fixed" />

      {/* Page header - Receipt Hog style, clear title */}
      <header className="sticky top-0 z-50 bg-[#1a0f3c]/95 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <h1 className="font-display text-xl font-bold text-[#FFFFFF] text-center tracking-tight">
          {t("surveys.title")}
        </h1>
      </header>

      {/* User status bar - total poin + tugas count (replaces "Your Opinion Earns Rewards") */}
      <div className="mx-4 mt-4 glass rounded-2xl p-4 border border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-theme-green/20 border border-theme-green/40 flex items-center justify-center">
            <Coins size={20} className="text-theme-green" />
          </div>
          <div>
            <p className="text-[11px] text-white/60 uppercase tracking-wider">
              {t("surveys.totalPoin")}
            </p>
            <p className="font-display font-bold text-[#FFFFFF] text-lg">
              {totalPoin.toLocaleString("id-ID")} <span className="text-theme-green text-sm">Poin</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 border border-white/10">
          <ListTodo size={16} className="text-theme-purple" />
          <span className="text-sm font-bold text-[#FFFFFF]">{tugasCount}</span>
          <span className="text-[11px] text-white/60">{t("surveys.tugasCount")}</span>
        </div>
      </div>

      {/* BitLabs - Premium Partner, mor-pembe gradient çerçeveli özel kart */}
      <div className="mx-4 mt-4">
        <button
          type="button"
          onClick={handleBitLabsClick}
          className="w-full rounded-2xl p-[2px] bg-gradient-to-r from-theme-pink via-theme-purple to-theme-pink transition-all hover:shadow-[0_0_24px_rgba(255,78,205,0.4)]"
        >
          <div className="rounded-[14px] glass p-4 bg-[#1a0f3c]/90 flex items-center gap-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-theme-pink/30 to-theme-purple/30 border border-white/20 flex items-center justify-center">
              <ClipboardList size={22} className="text-theme-pink" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-[#FFFFFF] text-[15px]">
                  {BITLABS_SURVEY.title}
                </h3>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-theme-pink/30 border border-theme-pink/50 text-theme-pink">
                  {t("surveys.premiumPartner")}
                </span>
              </div>
              <p className="text-[12px] text-white/70 mt-0.5">
                {t("surveys.earn")} {BITLABS_SURVEY.rewardCuan} Poin · {BITLABS_SURVEY.durationMin} {t("surveys.minutes")}
              </p>
            </div>
            <span className="shrink-0 px-5 py-2.5 rounded-full font-display font-bold text-sm bg-theme-green text-[#001a09] shadow-[0_0_18px_rgba(0,230,118,0.5)]">
              {t("surveys.ctaButtonAmbil")}
            </span>
          </div>
        </button>
      </div>

      {/* Tugas Lokal - Receipt Hog layout: icon left, description middle, Mulai right */}
      <section className="mx-4 mt-5">
        <h2 className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2">
          <ListTodo size={14} />
          {t("surveys.tugasLokal")}
        </h2>
        <div className="flex flex-col gap-3">
          {TUGAS_LOKAL.map((survey) => (
            <div
              key={survey.id}
              className="glass rounded-2xl p-4 border border-white/20 flex items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.25)] bg-[rgba(26,15,60,0.6)] backdrop-blur-xl"
            >
              {/* Left: Icon */}
              <div className="shrink-0 w-12 h-12 rounded-full bg-[rgba(155,92,255,0.25)] border border-white/20 flex items-center justify-center">
                <ClipboardList size={22} className="text-theme-green" />
              </div>

              {/* Middle: Description */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-[#FFFFFF] text-[15px]">
                  {survey.title}
                </h3>
                <p className="text-[12px] text-white/70 mt-0.5">
                  {t("surveys.earn")} {survey.rewardCuan} Poin · {survey.durationMin} {t("surveys.minutes")}
                </p>
              </div>

              {/* Right: Mulai button - neon green */}
              <button
                type="button"
                onClick={() => handleStartSurvey(survey.id)}
                className="shrink-0 px-5 py-2.5 rounded-full font-display font-bold text-sm bg-theme-green text-[#001a09] shadow-[0_0_18px_rgba(0,230,118,0.5)] hover:scale-105 active:scale-95 transition-transform"
              >
                {t("surveys.ctaButton")}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Survey history link */}
      <button
        type="button"
        onClick={handleShowHistory}
        className="mx-4 mt-6 flex items-center justify-center gap-2 text-theme-purple text-sm font-semibold underline underline-offset-2 hover:text-white/90 transition-colors"
      >
        {t("surveys.showHistory")}
        <ChevronRight size={16} />
      </button>

      <BottomNav />
    </div>
  );
}
