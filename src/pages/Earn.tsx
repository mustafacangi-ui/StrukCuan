import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  Video,
  Gamepad2,
  Coins,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";
import {
  useTodayRewardedTickets,
  TODAY_REWARDED_TICKETS_QUERY_KEY,
  MAX_ADS_PER_DAY,
  ticketsFromAds,
} from "@/hooks/useTodayRewardedTickets";
import { useBitLabsSurveys, type SurveyDisplay } from "@/hooks/useBitLabsSurveys";
import { useQueryClient } from "@tanstack/react-query";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import { convertCuanToTicket } from "@/hooks/useConvertCuan";
import { shakeToWin } from "@/hooks/useShakeToWin";
import { useShakeDetection, requestShakePermission, isShakeSupported } from "@/hooks/useShakeDetection";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";
import { AD_NETWORKS } from "@/config/adNetworks";
import { formatCurrency } from "@/config/locale";
import { StatsBar } from "@/components/StatsBar";
import BottomNav from "@/components/BottomNav";
import RewardedAdModal from "@/components/RewardedAdModal";
import SurveyListModal from "@/components/SurveyListModal";
import SurveyModal from "@/components/SurveyModal";
import { toast } from "sonner";

const WEEKLY_MAX = 42;

const CARD_BASE =
  "rounded-2xl p-4 bg-white/20 backdrop-blur-md border border-white/20 shadow-lg transition-all";

export default function Earn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isOnboarded, isLoading: authLoading } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { adsWatched, refetch } = useTodayRewardedTickets();
  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [surveyListOpen, setSurveyListOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDisplay | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);
  const [shakeModalOpen, setShakeModalOpen] = useState(false);
  const [shakeLoading, setShakeLoading] = useState(false);

  const { surveys, isLoading: surveysLoading } = useBitLabsSurveys(user?.id);

  const handleShake = useCallback(async () => {
    if (shakeLoading || !user?.id) return;
    setShakeLoading(true);
    try {
      const result = await shakeToWin();
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["user_stats"] });
        toast.success(`+${result.ticketsAdded} Bilet! 🎉`);
        setShakeModalOpen(false);
      } else {
        if (result.error === "SHAKE_ALREADY_USED") {
          toast.error("Sudah dipakai hari ini. Coba lagi besok!");
        } else if (result.error === "WEEKLY_LIMIT_REACHED") {
          toast.error("Batas tiket mingguan tercapai.");
        } else {
          toast.error(result.error);
        }
      }
    } catch (err) {
      toast.error("Gagal");
    } finally {
      setShakeLoading(false);
    }
  }, [shakeLoading, user?.id, queryClient]);

  useShakeDetection({
    onShake: handleShake,
    enabled: shakeModalOpen,
  });

  const cuan = stats?.cuan ?? 0;
  const countryCode = user?.countryCode ?? "ID";
  const progressPercent = Math.min(100, (weeklyTickets / WEEKLY_MAX) * 100);
  const ticketsFromAdsCount = ticketsFromAds(adsWatched);
  const isWeeklyLimitReached = weeklyTickets >= MAX_TICKETS_PER_WEEK;

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

  const isRedirecting = !authLoading && !isOnboarded;

  /** HARD RESET DEBUG: Set to false after confirming page renders */
  const FORCE_SHOW_EARN = true;

  const handleWatchAd = useCallback(() => {
    if (!user?.id) {
      toast.error("Masuk untuk mendapatkan tiket");
      return;
    }
    if (adsWatched >= MAX_ADS_PER_DAY) {
      toast.error("Batas harian tercapai. Coba lagi besok.");
      return;
    }
    if (isWeeklyLimitReached) {
      toast.error("Batas tiket mingguan tercapai.");
      return;
    }
    setPopupBlocked(false);
    window.open(AD_NETWORKS[0].url, "monetag_ad", "width=600,height=700,scrollbars=yes,resizable=yes");
    setShowModal(true);
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

  if (!FORCE_SHOW_EARN && authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-pink-600">
        <p className="text-white font-medium animate-pulse">Yükleniyor...</p>
      </div>
    );
  }

  if (!FORCE_SHOW_EARN && isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-pink-600">
        <p className="text-white font-medium animate-pulse">Yönlendiriliyor...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden bg-gradient-to-b from-purple-700 to-pink-600"
      style={{ position: "relative", zIndex: 9999, minHeight: "100vh", ...(FORCE_SHOW_EARN ? { background: "red" } : {}) }}
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

        {/* Cuan Balance + Convert */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins size={24} className="text-white" />
              <span className="text-sm font-bold text-white">Cuan Balance</span>
            </div>
            <span className="font-display font-bold text-xl text-white">
              {formatCurrency(cuan, countryCode)}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!user?.id) {
                toast.error("Masuk untuk mengonversi");
                return;
              }
              if (cuan < 100) {
                toast.error("Minimal 100 Cuan untuk ditukar");
                return;
              }
              if (isWeeklyLimitReached) {
                toast.error("Batas tiket mingguan tercapai.");
                return;
              }
              setConvertLoading(true);
              try {
                const { ticketsAdded } = await convertCuanToTicket();
                queryClient.invalidateQueries({ queryKey: ["user_stats"] });
                queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
                toast.success(`+${ticketsAdded} Bilet! 🎟️`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Gagal";
                if (msg === "INSUFFICIENT_CUAN") {
                  toast.error("Minimal 100 Cuan untuk ditukar");
                } else {
                  toast.error(msg);
                }
              } finally {
                setConvertLoading(false);
              }
            }}
            disabled={convertLoading || cuan < 100 || isWeeklyLimitReached}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg"
          >
            {convertLoading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                <RefreshCw size={18} />
                Convert 100 Cuan → 1 Ticket
              </>
            )}
          </button>
        </div>

        {/* A) Watch Ads */}
        <div className={CARD_BASE}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/30 border border-green-400/40">
              <Video size={24} className="text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Watch Ads</h3>
              <p className="text-xs text-white/80 mt-0.5">Earn tickets instantly</p>
              <p className="text-xs text-white/80 mt-0.5">{adsWatched}/{MAX_ADS_PER_DAY} ads · +{ticketsFromAdsCount} Tickets</p>
            </div>
            <button
              type="button"
              onClick={handleWatchAd}
              disabled={adsWatched >= MAX_ADS_PER_DAY || isWeeklyLimitReached || showModal}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-gradient-to-r from-green-400 to-emerald-600 shadow-lg"
            >
              {showModal ? "Watching..." : "Watch Ad"}
            </button>
          </div>
        </div>

        {/* B) Surveys */}
        <div className={CARD_BASE}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/30 border border-purple-400/40">
              <ClipboardList size={24} className="text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Surveys</h3>
              <p className="text-xs text-white/80 mt-0.5">Earn Cuan with BitLabs</p>
            </div>
            <button
              type="button"
              onClick={() => setSurveyListOpen(true)}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg"
            >
              Start
            </button>
          </div>
        </div>

        {/* C) Weekly Game */}
        <div className={CARD_BASE}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/30 border border-purple-400/40">
              <Smartphone size={24} className="text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Weekly Game</h3>
              <p className="text-xs text-white/80 mt-0.5">Shake to win 1-5 tickets · 1x/day</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!user?.id) {
                  toast.error("Masuk untuk bermain");
                  return;
                }
                if (isWeeklyLimitReached) {
                  toast.error("Batas tiket mingguan tercapai.");
                  return;
                }
                if (!isShakeSupported()) {
                  toast.error("Perangkat tidak mendukung. Coba di ponsel.");
                  return;
                }
                const granted = await requestShakePermission();
                if (!granted) {
                  toast.error("Izin sensor diperlukan untuk Shake to Win.");
                  return;
                }
                setShakeModalOpen(true);
              }}
              disabled={isWeeklyLimitReached}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg"
            >
              Shake
            </button>
          </div>
        </div>

        {/* Play - link to Promo */}
        <div className={CARD_BASE}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/30 border border-green-400/40">
              <Gamepad2 size={24} className="text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Play</h3>
              <p className="text-xs text-white/80 mt-0.5">Earn Tickets</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/promo")}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-green-400 to-emerald-600 shadow-lg"
            >
              Play
            </button>
          </div>
        </div>
      </div>

      <BottomNav />

      <RewardedAdModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleAdComplete}
        popupBlocked={popupBlocked}
      />

      <SurveyListModal
        open={surveyListOpen}
        onClose={() => setSurveyListOpen(false)}
        surveys={surveys}
        isLoading={surveysLoading}
        onSelectSurvey={(s) => {
          setSurveyListOpen(false);
          setSelectedSurvey(s);
        }}
      />

      {selectedSurvey && (
        <SurveyModal
          clickUrl={selectedSurvey.clickUrl}
          onClose={() => setSelectedSurvey(null)}
          userId={user?.id}
        />
      )}

      {/* Shake to Win modal */}
      {shakeModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="mx-4 max-w-sm rounded-2xl p-6 text-center bg-white/20 backdrop-blur-md border border-white/20 shadow-lg">
            <Smartphone size={48} className="mx-auto text-purple-300 mb-4" />
            <h3 className="font-display font-bold text-white text-lg mb-2">Salla Kazan!</h3>
            <p className="text-sm text-white/80 mb-4">
              Goyangkan ponsel. Dapat 1-5 bilet!
            </p>
            {shakeLoading && (
              <p className="text-purple-300 text-sm font-bold mb-2">Memproses...</p>
            )}
            <button
              type="button"
              onClick={() => setShakeModalOpen(false)}
              className="text-white/80 text-sm font-medium hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
