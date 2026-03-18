import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import { PageHeader } from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import RewardedAdModal from "@/components/RewardedAdModal";
import SurveyListModal from "@/components/SurveyListModal";
import SurveyModal from "@/components/SurveyModal";
import { toast } from "sonner";

const WEEKLY_MAX = 42;

const CARD_STYLE =
  "rounded-2xl p-4 border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all";
const GLASS = "rgba(255,255,255,0.18)";
const NEON_GREEN = "#4ade80";
const NEON_PINK = "#ec4899";
const DEEP_PURPLE = "#1e1b4b";

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
  const adProgressPercent = Math.min(100, (adsWatched / MAX_ADS_PER_DAY) * 100);
  const ticketsFromAdsCount = ticketsFromAds(adsWatched);
  const isWeeklyLimitReached = weeklyTickets >= MAX_TICKETS_PER_WEEK;

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

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

  if (!isOnboarded && !authLoading) return null;

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      {/* Background: deep purple + pink gradient, stars & blobs */}
      <div
        className="fixed inset-0 -z-10 bg-fixed"
        style={{
          background: "linear-gradient(180deg, #4c1d95 0%, #7c3aed 35%, #ec4899 70%, #1e1b4b 100%)",
        }}
      />
      <div
        className="fixed inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20% 30%, white, transparent),
            radial-gradient(2px 2px at 40% 70%, white, transparent),
            radial-gradient(2px 2px at 60% 20%, white, transparent),
            radial-gradient(2px 2px at 80% 80%, white, transparent)
          `,
        }}
      />
      <div
        className="fixed -z-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: "rgba(236,72,153,0.4)",
          top: "-10%",
          right: "-20%",
        }}
      />
      <div
        className="fixed -z-10 w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{
          background: "rgba(124,58,237,0.5)",
          bottom: "10%",
          left: "-15%",
        }}
      />

      <PageHeader title="Earn Tickets 🎟️" onBack={() => navigate(-1)} />

      <div className="px-4 mt-4 space-y-4">
        {/* Cuan Balance - neon pink + Convert */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins size={24} className="text-white" style={{ filter: "drop-shadow(0 0 8px rgba(236,72,153,0.8))" }} />
              <span className="text-sm font-medium text-white/90">Cuan Balance</span>
            </div>
            <span
              className="font-display font-bold text-xl"
              style={{ color: NEON_PINK, textShadow: "0 0 12px rgba(236,72,153,0.8)" }}
            >
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-display font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: NEON_GREEN,
              color: DEEP_PURPLE,
              boxShadow: "0 0 16px rgba(74,222,128,0.6)",
            }}
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

        {/* Weekly Progress */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Weekly Progress</span>
            <span className="text-sm font-bold text-white">{weeklyTickets}/{WEEKLY_MAX}</span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden bg-white/10"
            style={{ boxShadow: "0 0 12px rgba(74,222,128,0.3)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg, #4ade80, #22c55e)",
                boxShadow: "0 0 12px rgba(74,222,128,0.6)",
              }}
            />
          </div>
        </div>

        {/* Ad Progress */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Ad Progress</span>
            <span className="text-sm font-bold text-white">{adsWatched}/{MAX_ADS_PER_DAY}</span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden bg-white/10"
            style={{ boxShadow: "0 0 12px rgba(74,222,128,0.3)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${adProgressPercent}%`,
                background: "linear-gradient(90deg, #4ade80, #22c55e)",
                boxShadow: "0 0 12px rgba(74,222,128,0.6)",
              }}
            />
          </div>
        </div>

        {/* Watch Ad - Hot badge */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(74,222,128,0.2)",
                boxShadow: "0 0 16px rgba(74,222,128,0.5)",
              }}
            >
              <Video size={24} className="text-[#4ade80]" style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.8))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-white">Watch Ad</h3>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "linear-gradient(90deg, #f97316, #ef4444)",
                    color: "white",
                  }}
                >
                  🔥 Fastest
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">+{ticketsFromAdsCount} Tickets</p>
            </div>
            <button
              type="button"
              onClick={handleWatchAd}
              disabled={adsWatched >= MAX_ADS_PER_DAY || isWeeklyLimitReached || showModal}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: NEON_GREEN,
                color: DEEP_PURPLE,
                boxShadow: "0 0 20px rgba(74,222,128,0.8)",
              }}
            >
              {showModal ? "Watching..." : "Watch Ad"}
            </button>
          </div>
        </div>

        {/* Start Survey */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(74,222,128,0.2)",
                boxShadow: "0 0 16px rgba(74,222,128,0.5)",
              }}
            >
              <ClipboardList size={24} className="text-[#4ade80]" style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.8))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Start Survey</h3>
              <p className="text-xs text-white/70 mt-0.5">Earn Cuan</p>
            </div>
            <button
              type="button"
              onClick={() => setSurveyListOpen(true)}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: NEON_GREEN,
                color: DEEP_PURPLE,
                boxShadow: "0 0 20px rgba(74,222,128,0.8)",
              }}
            >
              Start
            </button>
          </div>
        </div>

        {/* Shake to Win - Weekly Game */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(74,222,128,0.2)",
                boxShadow: "0 0 16px rgba(74,222,128,0.5)",
              }}
            >
              <Smartphone size={24} className="text-[#4ade80]" style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.8))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Shake to Win</h3>
              <p className="text-xs text-white/70 mt-0.5">1-5 Bilet · 1x/hari</p>
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
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: NEON_GREEN,
                color: DEEP_PURPLE,
                boxShadow: "0 0 20px rgba(74,222,128,0.8)",
              }}
            >
              Shake
            </button>
          </div>
        </div>

        {/* Play - link to Promo */}
        <div
          className={CARD_STYLE}
          style={{
            background: GLASS,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(74,222,128,0.2)",
                boxShadow: "0 0 16px rgba(74,222,128,0.5)",
              }}
            >
              <Gamepad2 size={24} className="text-[#4ade80]" style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.8))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white">Play</h3>
              <p className="text-xs text-white/70 mt-0.5">Earn Tickets</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/promo")}
              className="shrink-0 px-5 py-2.5 rounded-xl font-display font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: NEON_GREEN,
                color: DEEP_PURPLE,
                boxShadow: "0 0 20px rgba(74,222,128,0.8)",
              }}
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

      {/* Shake to Win modal - "Salla!" prompt */}
      {shakeModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
          <div
            className="mx-4 max-w-sm rounded-2xl p-6 text-center border border-white/30"
            style={{
              background: GLASS,
              backdropFilter: "blur(16px)",
            }}
          >
            <Smartphone size={48} className="mx-auto text-[#4ade80] mb-4" style={{ filter: "drop-shadow(0 0 12px rgba(74,222,128,0.8))" }} />
            <h3 className="font-display font-bold text-white text-lg mb-2">Salla Kazan!</h3>
            <p className="text-sm text-white/70 mb-4">
              Goyangkan ponsel. Dapat 1-5 bilet!
            </p>
            {shakeLoading && (
              <p className="text-[#4ade80] text-sm font-medium mb-2">Memproses...</p>
            )}
            <button
              type="button"
              onClick={() => setShakeModalOpen(false)}
              className="text-white/60 text-sm hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
