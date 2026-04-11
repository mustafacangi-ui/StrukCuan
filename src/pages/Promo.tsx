import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import RewardedAdModal from "@/components/RewardedAdModal";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";
import {
  useTodayRewardedTickets,
  TODAY_REWARDED_TICKETS_QUERY_KEY,
  MAX_ADS_PER_DAY,
} from "@/hooks/useTodayRewardedTickets";
import { useUserTickets, USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import { toast } from "sonner";
import { AD_NETWORKS } from "@/config/adNetworks";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";
import { Play, Check } from "lucide-react";

const TIERS = [
  { target: 5, reward: 1 },
  { target: 10, reward: 1 },
  { target: 17, reward: 1 },
] as const;

export default function Promo() {
  const queryClient = useQueryClient();
  const { isOnboarded, isLoading, user } = useUser();
  const navigate = useNavigate();
  const { adsWatched, refetch } = useTodayRewardedTickets();
  const { data: ticketsThisWeek = 0 } = useUserTickets(user?.id);

  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const isWeeklyLimitReached = (ticketsThisWeek ?? 0) >= MAX_TICKETS_PER_WEEK;

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  const handleWatchAd = useCallback(() => {
    if (!user?.id) {
      toast.error("Please log in to earn tickets");
      return;
    }
    if (adsWatched >= MAX_ADS_PER_DAY) {
      toast.error("Daily ad limit reached (10/10). Come back tomorrow.");
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
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      invalidateLotteryPoolQueries(queryClient);
      toast.success("+1 Video counted!");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "Failed to grant";
      const isLimitReached = msg === "DAILY_LIMIT_REACHED";
      toast.error(isLimitReached ? "Daily limit reached (17 videos)." : msg);
      if (isLimitReached) await refetch();
      throw err;
    }
  }, [refetch, queryClient]);

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />

      <PageHeader title="Promo" onBack={() => navigate(-1)} />

      <div className="px-4 mt-4">
        {/* Total reward */}
        <div className="card-radar rounded-2xl p-4 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-white/80 font-semibold">
            Daily Ads Progress
          </p>
          <p className="text-lg font-display font-bold text-white mt-1">
            Total reward: <span className="text-[#facc15]">3 Tickets</span>
          </p>
          <p className="text-xs text-white/70 mt-0.5">
            Watch 5, 10, 17 videos → earn 1 ticket per tier
          </p>
        </div>

        {/* Tier cards */}
        <div className="space-y-3">
          {TIERS.map((tier, i) => {
            const current = Math.min(adsWatched, tier.target);
            const progress = (current / tier.target) * 100;
            const isCompleted = adsWatched >= tier.target;
            const canWatch = !isCompleted && adsWatched < MAX_ADS_PER_DAY;

            return (
              <div key={tier.target} className="card-radar rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">
                    Tier {i + 1}: {current}/{tier.target} videos
                  </span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#00FF88]/20 border border-[#00FF88]/30 px-2.5 py-1 text-xs font-bold text-[#00FF88]">
                      <Check size={14} />
                      Done
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleWatchAd}
                      disabled={!canWatch || showModal}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        canWatch && !showModal ? "bg-[#facc15] text-[#0a0e14]" : "bg-white/10 text-white/70"
                      }`}
                    >
                      <Play size={12} fill="currentColor" />
                      {showModal ? "Watching..." : "Watch Ad"}
                    </button>
                  )}
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {adsWatched >= MAX_ADS_PER_DAY && (
          <p className="mt-4 text-center text-xs text-white/70">
            Daily limit reached. Come back tomorrow.
          </p>
        )}
      </div>

      <LegalFooter />
      <BottomNav />

      <RewardedAdModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleAdComplete}
        popupBlocked={popupBlocked}
      />
    </div>
  );
}
