import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  Video,
} from "lucide-react";
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
import RewardedAdModal from "@/components/RewardedAdModal";
import SurveyModal from "@/components/SurveyModal";
import { toast } from "sonner";
import { getCountdownParts } from "@/lib/weeklyCountdown";

const WEEKLY_MAX = 42;

const CARD_BASE =
  "rounded-2xl p-4 bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl ring-1 ring-white/10 transition-all";

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
      } catch (err) {
        console.error("[Earn] countdown tick error:", err);
        setCountdown(DEFAULT_COUNTDOWN);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-pink-600">
        <p className="text-white font-medium animate-pulse">Yükleniyor...</p>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-pink-600">
        <p className="text-white font-medium animate-pulse">Yönlendiriliyor...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden bg-gradient-to-b from-purple-700 to-pink-600"
      style={{ position: "relative", zIndex: 10, minHeight: "100vh" }}
    >
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-purple-700 to-pink-600" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-white/20 border border-white/20 p-2 hover:bg-white/30 transition-colors shrink-0"
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
        {/* Progress Section */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Your Progress</span>
            <span className="text-sm font-bold text-white">{weeklyTickets} / {WEEKLY_MAX} tickets</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-emerald-600"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Bölüm 1: WATCH ADS (Üst) */}
        <div className={CARD_BASE}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/30 border border-green-400/40">
              <Video size={24} className="text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Watch Ads</h3>
              <p className="text-xs text-white/80 mt-0.5">Earn tickets instantly</p>
            </div>
          </div>
          <p className="text-xs text-[#4ade80] mb-2 font-medium">Watch 5 videos to earn 1 Ticket</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/90">Progress</span>
            <span className="font-display font-bold text-white">{adsWatched ?? 0} / 5</span>
          </div>
          <button
            type="button"
            onClick={handleWatchAd}
            disabled={(adsWatched ?? 0) >= MAX_ADS_PER_DAY || isWeeklyLimitReached || showModal}
            className="w-full py-3 rounded-xl font-display font-bold text-sm text-[#001a09] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-theme-green shadow-[0_0_18px_rgba(0,230,118,0.55)]"
          >
            {showModal ? "Watching..." : "Watch Ad"}
          </button>
        </div>

        {/* Bölüm 2: SURVEYS (Orta) */}
        <div className={CARD_BASE}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/30 border border-purple-400/40">
              <ClipboardList size={24} className="text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Complete Surveys</h3>
              <p className="text-xs text-white/80 mt-0.5">Earn tickets directly</p>
            </div>
          </div>
          <div className="space-y-3">
            <span className="text-xs font-bold text-white/90">Survey List</span>
            {surveysLoading ? (
              <p className="text-sm text-white/80 py-6">Memuat survei...</p>
            ) : displaySurveys.length === 0 ? (
              <p className="text-sm text-white/80 py-6">Survei tidak tersedia saat ini.</p>
            ) : (
              displaySurveys.map((survey, index) => {
                const isFeatured = index === 0;
                const ticketLabel = isFeatured ? "🎟️ 2 TICKETS" : "🎟️ 1 TICKET";
                return (
                  <button
                    key={survey.id}
                    type="button"
                    onClick={() => setSelectedSurvey(survey)}
                    className={`w-full rounded-2xl p-4 bg-white/10 backdrop-blur-md flex items-center gap-4 text-left hover:bg-white/15 transition-all relative ${
                      isFeatured
                        ? "border-2 border-[#4ade80]/60 shadow-[0_0_20px_rgba(74,222,128,0.25)]"
                        : "border border-white/20 hover:border-white/30"
                    }`}
                  >
                    {isFeatured && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#4ade80]/30 text-[#4ade80] border border-[#4ade80]/50">
                        🔥 BEST OFFER
                      </span>
                    )}
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                      <span className="text-xl">📋</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <h4 className="font-display font-bold text-white text-sm truncate">
                        {survey.title || "BitLabs Survey"}
                      </h4>
                      <p className="text-sm font-bold text-[#4ade80] mt-1 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">{ticketLabel}</p>
                    </div>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0 px-4 py-2 rounded-xl font-display font-bold text-xs text-[#001a09] bg-[#4ade80] shadow-[0_0_16px_rgba(74,222,128,0.6)] hover:bg-[#4ade80]/90 transition-colors">
                      START
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Bölüm 3: LUCKY SHAKE */}
        <LuckyShakeCard
          countdown={countdown}
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
