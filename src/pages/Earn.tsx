import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import {
  useTodayRewardedTickets,
  TODAY_REWARDED_TICKETS_QUERY_KEY,
  MAX_ADS_PER_DAY,
} from "@/hooks/useTodayRewardedTickets";
import { useBitLabsSurveys, type SurveyDisplay } from "@/hooks/useBitLabsSurveys";
import { useQueryClient } from "@tanstack/react-query";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";
import { AD_NETWORKS } from "@/config/adNetworks";
import { StatsBar } from "@/components/StatsBar";
import BottomNav from "@/components/BottomNav";
import LuckyShakeCard from "@/components/LuckyShakeCard";
import WatchAdsCard from "@/components/WatchAdsCard";
import SurveysCard from "@/components/SurveysCard";
import RewardedAdModal from "@/components/RewardedAdModal";
import SurveyModal from "@/components/SurveyModal";
import { toast } from "sonner";
import { getCountdownParts } from "@/lib/weeklyCountdown";
import { CARD_BASE, BTN_GLASS } from "@/lib/designTokens";

const WEEKLY_MAX = 42;

const DEFAULT_COUNTDOWN = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export default function Earn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isOnboarded, isLoading: authLoading } = useUser();
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { adsWatched, refetch } = useTodayRewardedTickets();
  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDisplay | null>(null);
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const [countdownReady, setCountdownReady] = useState(false);

  const { surveys = [], isLoading: surveysLoading } = useBitLabsSurveys(user?.id);

  const displaySurveys = useMemo(() => {
    try {
      const list = Array.isArray(surveys) ? surveys : [];
      const longer = list.filter((s) => (s?.durationMin ?? 0) > 3);
      const shorter = list.filter((s) => (s?.durationMin ?? 0) <= 3);
      return [...longer, ...shorter].slice(0, 5);
    } catch {
      return [];
    }
  }, [surveys]);

  useEffect(() => {
    const tick = () => {
      try {
        setCountdown(getCountdownParts());
        setCountdownReady(true);
      } catch (err) {
        console.error("[Earn] countdown tick error:", err);
        setCountdown(DEFAULT_COUNTDOWN);
        setCountdownReady(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const progressPercent = Math.min(100, ((weeklyTickets ?? 0) / WEEKLY_MAX) * 100);
  const isWeeklyLimitReached = (weeklyTickets ?? 0) >= MAX_TICKETS_PER_WEEK;

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/home", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

  const isRedirecting = !authLoading && !isOnboarded;

  const handleWatchAd = useCallback(() => {
    try {
      if (!user?.id) {
        toast.error("Masuk untuk mendapatkan tiket");
        return;
      }
      if ((adsWatched ?? 0) >= MAX_ADS_PER_DAY) {
        toast.error("Batas harian tercapai. Coba lagi besok.");
        return;
      }
      if (isWeeklyLimitReached) {
        toast.error("Batas tiket mingguan tercapai.");
        return;
      }
      setPopupBlocked(false);
      const adUrl = AD_NETWORKS?.[0]?.url;
      if (adUrl) {
        window.open(adUrl, "monetag_ad", "width=600,height=700,scrollbars=yes,resizable=yes");
      }
      setShowModal(true);
    } catch (err) {
      console.error("[Earn] Watch Ad error:", err);
      toast.error("Gagal");
    }
  }, [user?.id, adsWatched, isWeeklyLimitReached]);

  const handleAdComplete = useCallback(async () => {
    try {
      await grantTicket();
      await refetch();
      queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      toast.success("+1 Video dihitung!");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "Gagal";
      const isLimitReached = msg === "DAILY_LIMIT_REACHED";
      toast.error(isLimitReached ? "Batas harian tercapai." : msg);
      if (isLimitReached) await refetch();
      throw err;
    }
  }, [refetch, queryClient]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0726]">
        <p className="text-white font-medium animate-pulse">Yükleniyor...</p>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0726]">
        <p className="text-white font-medium animate-pulse">Yönlendiriliyor...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#0f0726 0%,#1a0d40 50%,#0d0520 100%)", position: "relative", zIndex: 10, minHeight: "100vh" }}
    >
      <div className="fixed inset-0 -z-10" style={{ background: "linear-gradient(160deg,#0f0726 0%,#1a0d40 50%,#0d0520 100%)" }} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`rounded-xl p-2 shrink-0 ${BTN_GLASS}`}
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-white">Earn Tickets</h1>
              <p className="text-sm text-white/80">Earn up to 42 tickets this week</p>
            </div>
          </div>
        </div>
        <StatsBar compact />
      </div>

      <div className="relative z-10 px-4 mt-4 space-y-4">
        {/* Progress Section — green = system/progress */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Your Progress</span>
            <span className="text-sm font-bold text-white">{weeklyTickets} / {WEEKLY_MAX} tickets</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg, #00E676 0%, #00c853 100%)",
                boxShadow: "0 0 12px rgba(0,230,118,0.5)",
              }}
            />
          </div>
        </div>

        {/* Bölüm 1: WATCH ADS (Üst) */}
        <WatchAdsCard
          adsWatched={adsWatched ?? 0}
          maxAds={MAX_ADS_PER_DAY}
          isWeeklyLimitReached={isWeeklyLimitReached}
          showModal={showModal}
          onWatchAd={handleWatchAd}
        />

        {/* Bölüm 2: SURVEYS (Orta) */}
        <SurveysCard
          surveys={displaySurveys}
          isLoading={surveysLoading}
          onSelect={setSelectedSurvey}
        />

        {/* Bölüm 3: LUCKY SHAKE */}
        <LuckyShakeCard
          countdown={countdown}
          countdownReady={countdownReady}
          userId={user?.id}
          isWeeklyLimitReached={isWeeklyLimitReached}
        />
      </div>

      <BottomNav />

      <RewardedAdModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleAdComplete}
        popupBlocked={popupBlocked}
      />

      {selectedSurvey && (
        <SurveyModal
          clickUrl={selectedSurvey?.clickUrl ?? ""}
          onClose={() => setSelectedSurvey(null)}
          userId={user?.id}
        />
      )}

    </div>
  );
}
