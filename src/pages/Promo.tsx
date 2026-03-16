import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import PromoHeader from "@/components/PromoHeader";
import { PageHeader } from "@/components/PageHeader";
import PromoCard from "@/components/promo/PromoCard";
import RewardedAdModal from "@/components/RewardedAdModal";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import {
  useTodayRewardedTickets,
  TODAY_REWARDED_TICKETS_QUERY_KEY,
  MAX_ADS_PER_DAY,
} from "@/hooks/useTodayRewardedTickets";
import { useUserTickets, USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import { toast } from "sonner";
import { AD_NETWORKS } from "@/config/adNetworks";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";
import type { PromoState } from "@/components/promo/PromoCard";
import WatchEarnCard from "@/components/promo/WatchEarnCard";


/**
 * Derive promo UI state from ads watched.
 * Clean flow: start (0) → progress (1-14) → final_limit (15)
 */
function getPromoState(
  adsWatched: number,
  _bonusProgress: number,
  _bonusUnlocked: boolean,
  viewOverride: "wallet" | "weekly_draw" | null,
  justEarnedTicket: boolean
): PromoState {
  if (viewOverride === "wallet") return "wallet";
  if (viewOverride === "weekly_draw") return "weekly_draw";
  if (justEarnedTicket) return "ticket_earned";
  if (adsWatched >= MAX_ADS_PER_DAY) return "final_limit";
  if (adsWatched >= 1) return "progress";
  return "start";
}

export default function Promo() {
  const queryClient = useQueryClient();
  const { isOnboarded, isLoading, user } = useUser();
  const navigate = useNavigate();
  const { tickets, adsWatched, maxAds, refetch } = useTodayRewardedTickets();
  const { data: ticketsThisWeek = 0 } = useUserTickets(user?.id);

  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [viewOverride, setViewOverride] = useState<"wallet" | "weekly_draw" | null>(null);
  const [justEarnedTicket, setJustEarnedTicket] = useState(false);
  const [bonusUnlocked, setBonusUnlocked] = useState(false);

  const totalAds = adsWatched;
  const state = getPromoState(adsWatched, 0, bonusUnlocked, viewOverride, justEarnedTicket);

  /** Weekly ticket limit reached - disable Watch Ad buttons */
  const isWeeklyLimitReached = (ticketsThisWeek ?? 0) >= MAX_TICKETS_PER_WEEK;

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
    if (adsWatched >= maxAds) {
      toast.error("Daily limit reached (15 ads). Come back tomorrow.");
      return;
    }
    setPopupBlocked(false);
    const monetagUrl = AD_NETWORKS[0].url;
    const popup = window.open(monetagUrl, "monetag_ad", "width=600,height=700,scrollbars=yes,resizable=yes");
    if (!popup || popup.closed) setPopupBlocked(true);
    setShowModal(true);
  }, [user?.id, adsWatched, maxAds]);

  const handleAdComplete = useCallback(async () => {
    setJustEarnedTicket(false);
    console.log("[Promo] handleAdComplete - ad finished, granting ticket...");
    try {
      const result = await grantTicket();
      console.log("[Promo] grantTicket OK:", result);
      await refetch();
      queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      console.log("[Promo] Refetched, adsWatched should update");
      setJustEarnedTicket(true);
      setTimeout(() => setJustEarnedTicket(false), 3000);
    } catch (err: unknown) {
      console.error("[Promo] handleAdComplete error:", err);
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "Failed to grant ticket";
      const isLimitReached = msg === "DAILY_LIMIT_REACHED";
      toast.error(isLimitReached ? "Daily limit reached (15 ads). Come back tomorrow." : msg);
      if (isLimitReached) {
        await refetch();
        queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      }
      throw err;
    }
  }, [refetch, queryClient]);

  const handleUnlockBonus = useCallback(() => {
    setBonusUnlocked(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  const latestTicket = tickets.length > 0 ? tickets[tickets.length - 1] : null;

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      {/* Global gradient - matches all pages */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff6ec4] via-[#c94fd6] to-[#8e2de2]" />

      <PageHeader title="Promo" onBack={() => navigate(-1)} />

      <PromoHeader />

      {/* SECTION 1 — Reward Guide (Top) */}
      <div className="mt-6 px-4">
        <div className="overflow-hidden rounded-xl border border-pink-500/30 bg-black/30 backdrop-blur-sm">
          <img
            src="/reward-guide.png"
            alt="Reward System Guide: 5 ads → 1 ticket, 10 ads → 2 tickets, Super bonus, 17 ads → 3 tickets"
            className="w-full object-contain"
          />
        </div>
      </div>

      {/* SECTION 1b — Watch & Earn Cards */}
      <div className="mt-4 px-4 space-y-3">
        <h2 className="text-sm font-bold text-white/90">Watch & Earn</h2>
        <WatchEarnCard
          adRange="1-5"
          reward={1}
          isCompleted={adsWatched >= 5}
          disabled={isWeeklyLimitReached}
          onWatchAd={handleContinueEarning}
          isWatching={showModal}
        />
        <WatchEarnCard
          adRange="5-10"
          reward={2}
          isCompleted={adsWatched >= 10}
          disabled={isWeeklyLimitReached}
          onWatchAd={handleContinueEarning}
          isWatching={showModal}
        />
        <WatchEarnCard
          adRange="13-17"
          reward={3}
          isCompleted={adsWatched >= 15}
          disabled={isWeeklyLimitReached}
          onWatchAd={handleContinueEarning}
          isWatching={showModal}
        />
      </div>

      {/* SECTION 2 — Reward Action Panel (Below) */}
      <div className="mt-6 px-4">
        <PromoCard
          state={state}
          adsWatched={adsWatched}
          ticketsThisWeek={ticketsThisWeek}
          tickets={tickets}
          maxAds={maxAds}
          bonusUnlocked={bonusUnlocked}
          latestTicketNumber={latestTicket?.ticket_number}
          onContinueEarning={handleContinueEarning}
          onUnlockBonus={undefined}
          onKeepWatching={handleContinueEarning}
          onViewWallet={() => setViewOverride("wallet")}
          onViewWeeklyDraw={() => setViewOverride("weekly_draw")}
          onBack={() => setViewOverride(null)}
          isWatching={showModal}
        />
      </div>

      {adsWatched >= MAX_ADS_PER_DAY && !viewOverride && (
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
