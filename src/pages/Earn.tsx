import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
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
import { useMyLotteryBallots } from "@/hooks/useMyLotteryBallots";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";
import { invalidateTicketQueries } from "@/lib/grantTickets";
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
import { getCountdownParts, getDailyShakeCountdownParts } from "@/lib/weeklyCountdown";
import { CARD_BASE, BTN_GLASS, PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

const TICKETS_PER_ENTRY = 10;

const DEFAULT_COUNTDOWN = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export default function Earn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isOnboarded, isLoading: authLoading } = useUser();
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { data: stats } = useUserStats(user?.id);
  const totalTickets = stats?.tiket ?? 0;
  const { data: myBallotIds = [], isLoading: ballotsLoading, isError: ballotsError } = useMyLotteryBallots(user?.id);
  const { adsWatched, refetch } = useTodayRewardedTickets();
  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDisplay | null>(null);
  const [autoOpenSurveys, setAutoOpenSurveys] = useState(false);
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const [countdownReady, setCountdownReady] = useState(false);
  const [shakeCountdown, setShakeCountdown] = useState(DEFAULT_COUNTDOWN);
  const [shakeCountdownReady, setShakeCountdownReady] = useState(false);
  const [showEntryAnimation, setShowEntryAnimation] = useState(false);
  const prevTicketsRef = useRef<number>(totalTickets);

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
        setShakeCountdown(getDailyShakeCountdownParts());
        setShakeCountdownReady(true);
      } catch (err) {
        console.error("[Earn] countdown tick error:", err);
        setCountdown(DEFAULT_COUNTDOWN);
        setCountdownReady(true);
        setShakeCountdown(DEFAULT_COUNTDOWN);
        setShakeCountdownReady(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isWeeklyLimitReached = (weeklyTickets ?? 0) >= MAX_TICKETS_PER_WEEK;
  const todayAds = adsWatched ?? 0;
  const entriesEarned = Math.floor(totalTickets / TICKETS_PER_ENTRY);
  const progressInBatch = totalTickets % TICKETS_PER_ENTRY;

  // Detect crossing a multiple of TICKETS_PER_ENTRY → trigger animation
  useEffect(() => {
    const prev = prevTicketsRef.current;
    const cur = totalTickets;
    if (cur > 0 && cur > prev && Math.floor(cur / TICKETS_PER_ENTRY) > Math.floor(prev / TICKETS_PER_ENTRY)) {
      setShowEntryAnimation(true);
      const timer = setTimeout(() => setShowEntryAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
    prevTicketsRef.current = cur;
  }, [totalTickets]);

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/home", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

  // Handle auto-open surveys when redirected from /surveys route
  useEffect(() => {
    const locationState = location.state as { openSurveys?: boolean } | null;
    if (locationState?.openSurveys && !surveysLoading && user?.id) {
      setAutoOpenSurveys(true);
      // Clear the state to prevent re-triggering on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, surveysLoading, user?.id]);

  const isRedirecting = !authLoading && !isOnboarded;

  const handleWatchAd = useCallback(() => {
    try {
      if (!user?.id) {
        toast.error(t("auth.mustLogin"));
        return;
      }
      if ((adsWatched ?? 0) >= MAX_ADS_PER_DAY) {
        toast.error(t("earn.watchAds.dailyLimit"));
        return;
      }
      if (isWeeklyLimitReached) {
        toast.error(t("earn.weeklyLimit"));
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
      toast.error(t("common.error"));
    }
  }, [user?.id, adsWatched, isWeeklyLimitReached, t]);

  const handleAdComplete = useCallback(async () => {
    try {
      console.log('[Ads] completed sequence — calling grantTicket()');
      await grantTicket();
      await refetch();
      queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      invalidateTicketQueries(queryClient);
      invalidateLotteryPoolQueries(queryClient);
      console.log('[Ads] all queries invalidated');
      toast.success(t("earn.watchAds.ticketEarned"));
    } catch (err: unknown) {
      console.error('[Ads] handleAdComplete error:', err);
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : t("common.error");
      const isLimitReached = msg === "DAILY_LIMIT_REACHED";
      toast.error(isLimitReached ? t("earn.watchAds.dailyLimit") : msg);
      if (isLimitReached) await refetch();
      throw err;
    }
  }, [refetch, queryClient, t]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0726]">
        <p className="text-white font-medium animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0726]">
        <p className="text-white font-medium animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden"
      style={{ background: PREMIUM_PAGE_BACKGROUND, position: "relative", zIndex: 10, minHeight: "100vh" }}
    >
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />

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
              <h1 className="font-display text-xl font-bold text-white">{t("earn.title")}</h1>
              <p className="text-sm text-white/80">{t("earn.subtitle")}</p>
            </div>
          </div>
        </div>
        <StatsBar compact />
      </div>

      <div className="relative z-10 px-4 mt-4 space-y-4">
        {/* Draw Entry Progress — 10 tickets = 1 draw entry */}
        <div
          className={`${CARD_BASE} relative overflow-hidden`}
          style={showEntryAnimation ? { boxShadow: "0 0 40px rgba(0,230,118,0.6), 0 0 80px rgba(0,230,118,0.3)" } : {}}
        >
          {/* Entry earned burst overlay */}
          {showEntryAnimation && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-20 rounded-2xl"
              style={{ background: "rgba(0,0,0,0.75)", animation: "fadeInOut 3s ease-in-out forwards" }}
            >
              <span className="text-4xl mb-2">🎟️</span>
              <p className="font-display font-bold text-xl text-[#00E676] drop-shadow-[0_0_12px_rgba(0,230,118,0.9)]">
                {t("earn.entryEarned")}
              </p>
              <p className="text-xs text-white/70 mt-1">{t("earn.entryEarnedSub")}</p>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-bold text-white">{t("earn.drawEntryProgress")}</span>
              <p className="text-[10px] text-white/50 mt-0.5">{t("earn.drawEntryDesc", { n: TICKETS_PER_ENTRY })}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {entriesEarned > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,230,118,0.2)", color: "#00E676", border: "1px solid rgba(0,230,118,0.4)" }}
                >
                  🎟️ ×{entriesEarned}
                </span>
              )}
              <span className="font-display text-sm font-bold text-white tabular-nums">
                {progressInBatch} <span className="text-white/40">/ {TICKETS_PER_ENTRY}</span>
              </span>
            </div>
          </div>

          {/* 10-segment progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: TICKETS_PER_ENTRY }, (_, i) => {
              const filled = i < progressInBatch;
              const justFilled = false;
              return (
                <div
                  key={i}
                  className="flex-1 h-5 rounded-md transition-all duration-300"
                  style={{
                    background: filled
                      ? "linear-gradient(135deg, #00E676 0%, #00c853 100%)"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: filled ? "0 0 8px rgba(0,230,118,0.5)" : "none",
                    transform: justFilled ? "scale(1.1)" : "scale(1)",
                  }}
                />
              );
            })}
          </div>

          {/* Caption */}
          <p className="text-[10px] text-white/40 mt-2 text-right uppercase tracking-widest">
            {t("earn.entryRemaining", { remaining: progressInBatch === 0 ? TICKETS_PER_ENTRY : TICKETS_PER_ENTRY - progressInBatch })}
          </p>

          {/* Pool ballot IDs — same rows used in Sunday draw */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-[11px] font-bold text-white/90 mb-1">{t("earn.ballotNumbersTitle")}</p>
            <p className="text-[10px] text-white/45 mb-2 leading-snug">{t("earn.ballotNumbersHint")}</p>
            {ballotsError ? (
              <p className="text-[10px] text-white/35">{t("earn.ballotNumbersEmpty")}</p>
            ) : ballotsLoading ? (
              <p className="text-[10px] text-white/35">{t("common.loading")}</p>
            ) : myBallotIds.length === 0 ? (
              <p className="text-[10px] text-white/35">{t("earn.ballotNumbersEmpty")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {myBallotIds.map((id) => (
                  <span
                    key={id}
                    className="font-mono text-[11px] font-bold tabular-nums px-2 py-1 rounded-lg"
                    style={{
                      background: "rgba(0,230,118,0.12)",
                      color: "#69F0AE",
                      border: "1px solid rgba(0,230,118,0.35)",
                    }}
                  >
                    #{id}
                  </span>
                ))}
              </div>
            )}
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
          autoOpen={autoOpenSurveys}
        />

        {/* Bölüm 3: LUCKY SHAKE */}
        <LuckyShakeCard
          countdown={shakeCountdown}
          countdownReady={shakeCountdownReady}
          userId={user?.id}
          isWeeklyLimitReached={isWeeklyLimitReached}
        />
      </div>

      <BottomNav />

      <RewardedAdModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleAdComplete}
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
