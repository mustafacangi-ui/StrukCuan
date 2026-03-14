import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import PromoHeader from "@/components/PromoHeader";
import PromoCard from "@/components/promo/PromoCard";
import RewardedAdModal from "@/components/RewardedAdModal";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { useTodayRewardedTickets } from "@/hooks/useTodayRewardedTickets";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import { toast } from "sonner";
import { AD_NETWORKS } from "@/config/adNetworks";
import type { PromoState } from "@/components/promo/PromoCard";

/** Daily limit: 10 ads. 1 ad = 1 ticket. */
const DAILY_MAX_ADS = 10;
const BONUS_EXTRA_ADS = 5;

/**
 * Derive promo UI state from ads watched and bonus progress.
 * Flow: start (0) → progress (1–4) → ticket_earned (5) → progress_5_10 (6–9) → daily_limit (10) → bonus_modal → bonus_unlocked → final_limit
 */
function getPromoState(
  adsWatched: number,
  bonusProgress: number,
  bonusUnlocked: boolean,
  viewOverride: "wallet" | "weekly_draw" | null,
  justEarnedTicket: boolean
): PromoState {
  if (viewOverride === "wallet") return "wallet";
  if (viewOverride === "weekly_draw") return "weekly_draw";
  if (justEarnedTicket) return "ticket_earned";

  const totalAds = bonusUnlocked ? DAILY_MAX_ADS + bonusProgress : adsWatched;

  if (adsWatched >= DAILY_MAX_ADS && !bonusUnlocked) return "daily_limit";
  if (adsWatched >= DAILY_MAX_ADS && bonusUnlocked && totalAds >= DAILY_MAX_ADS + BONUS_EXTRA_ADS) {
    return "final_limit";
  }
  if (adsWatched >= DAILY_MAX_ADS && bonusUnlocked) return "bonus_unlocked";
  if (bonusUnlocked && totalAds > DAILY_MAX_ADS && totalAds < DAILY_MAX_ADS + BONUS_EXTRA_ADS) {
    return "progress_5_10";
  }
  if (adsWatched >= 6 && adsWatched <= 9) return "progress_5_10";
  if (adsWatched === 5) return "ticket_earned";
  if (adsWatched >= 1 && adsWatched <= 4) return "progress";
  return "start";
}

export default function Promo() {
  const { isOnboarded, isLoading, user } = useUser();
  const navigate = useNavigate();
  const { tickets, ticketsToday, adsWatched, maxAds, refetch } = useTodayRewardedTickets(user?.id);

  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [viewOverride, setViewOverride] = useState<"wallet" | "weekly_draw" | null>(null);
  const [justEarnedTicket, setJustEarnedTicket] = useState(false);
  const [bonusProgress, setBonusProgress] = useState(0);
  const [bonusUnlocked, setBonusUnlocked] = useState(false);

  const totalAds = bonusUnlocked ? Math.min(adsWatched + bonusProgress, DAILY_MAX_ADS + BONUS_EXTRA_ADS) : adsWatched;
  const state = getPromoState(
    adsWatched,
    bonusProgress,
    bonusUnlocked,
    viewOverride,
    justEarnedTicket
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  const handleContinueEarning = useCallback(() => {
    if (!user?.id) {
      toast.error("Please log in to earn tickets");
      return;
    }
    if (adsWatched >= maxAds && !bonusUnlocked) {
      toast.error("Daily limit reached (10 ads watched)");
      return;
    }
    setPopupBlocked(false);
    const monetagUrl = AD_NETWORKS[0].url;
    const popup = window.open(monetagUrl, "monetag_ad", "width=600,height=700,scrollbars=yes,resizable=yes");
    if (!popup || popup.closed) setPopupBlocked(true);
    setShowModal(true);
  }, [user?.id, adsWatched, maxAds, bonusUnlocked]);

  const handleAdComplete = useCallback(async () => {
    setJustEarnedTicket(false);
    try {
      await grantTicket();
      await refetch();
      setJustEarnedTicket(true);
      if (bonusUnlocked) setBonusProgress((p) => Math.min(p + 1, BONUS_EXTRA_ADS));
      setTimeout(() => setJustEarnedTicket(false), 3000);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "Failed to grant ticket";
      const isLimitReached = msg === "DAILY_LIMIT_REACHED";
      toast.error(isLimitReached ? "Daily limit reached (10 ads watched). Come back tomorrow." : msg);
      if (isLimitReached) await refetch();
      throw err;
    }
  }, [refetch, bonusUnlocked]);

  const handleUnlockBonus = useCallback(() => {
    setBonusUnlocked(true);
    setBonusProgress(0);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  const latestTicket = tickets.length > 0 ? tickets[tickets.length - 1] : null;

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      {/* Cosmic background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0612] via-[#1a0a2e] to-[#0d0518]" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-10 h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
          <div className="absolute top-40 right-20 h-1 w-1 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-40 left-1/4 h-1.5 w-1.5 rounded-full bg-fuchsia-300 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-60 right-1/3 h-1 w-1 rounded-full bg-pink-300 animate-pulse" style={{ animationDelay: "0.3s" }} />
          <div className="absolute top-1/3 left-1/2 h-2 w-2 rounded-full bg-amber-300/60 animate-pulse" style={{ animationDelay: "0.8s" }} />
        </div>
      </div>

      <PromoHeader />

      <div className="mt-6 px-4">
        <PromoCard
          state={state}
          adsWatched={bonusUnlocked ? totalAds : adsWatched}
          ticketsToday={ticketsToday}
          tickets={tickets}
          maxAds={maxAds}
          bonusProgress={bonusProgress}
          bonusUnlocked={bonusUnlocked}
          latestTicketNumber={latestTicket?.ticket_number}
          onContinueEarning={handleContinueEarning}
          onUnlockBonus={adsWatched >= DAILY_MAX_ADS ? handleUnlockBonus : undefined}
          onKeepWatching={handleContinueEarning}
          onViewWallet={() => setViewOverride("wallet")}
          onViewWeeklyDraw={() => setViewOverride("weekly_draw")}
          onBack={() => setViewOverride(null)}
          isWatching={showModal}
        />
      </div>

      {adsWatched >= maxAds && !viewOverride && (
        <p className="mt-4 px-4 text-center text-xs text-white/60">
          Come back tomorrow for more chances to earn tickets.
        </p>
      )}

      <LegalFooter />
      <BottomNav />

      <RewardedAdModal
        open={showModal}
        onClose={handleModalClose}
        onComplete={handleAdComplete}
        popupBlocked={popupBlocked}
      />
    </div>
  );
}
