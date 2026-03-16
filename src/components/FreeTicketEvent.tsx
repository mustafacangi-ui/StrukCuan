import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ticket, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import { useTodayRewardedTickets, TODAY_REWARDED_TICKETS_QUERY_KEY, ticketsFromAds } from "@/hooks/useTodayRewardedTickets";
import { useUserTickets, USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import RewardedAdModal from "@/components/RewardedAdModal";
import { toast } from "sonner";
import { AD_NETWORKS } from "@/config/adNetworks";

/**
 * Free Ticket Event - Monetag rewarded ad (popup).
 * Watch ad → Close → grant_ticket RPC → ticket earned.
 * 5→1, 10→1, 17→1 tickets. Max 17 ads / 3 tickets per day.
 */
export default function FreeTicketEvent() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { adsWatched, ticketsFromAdsToday, maxAds, invalidate } = useTodayRewardedTickets();
  const { data: ticketsThisWeek = 0 } = useUserTickets(user?.id);
  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limitReached = adsWatched >= maxAds;

  const handleWatchVideo = useCallback(() => {
    if (!user?.id) {
      toast.error("Please log in to earn tickets");
      return;
    }
    if (limitReached) {
      toast.error("Daily limit reached (17 ads). Come back tomorrow.");
      return;
    }
    setErrorMsg(null);
    setShowSuccess(false);
    setPopupBlocked(false);
    setShowModal(true);

    const monetagUrl = AD_NETWORKS[0].url;
    const popup = window.open(
      monetagUrl,
      "monetag_ad",
      "width=600,height=700,scrollbars=yes,resizable=yes"
    );
    if (!popup || popup.closed) {
      setPopupBlocked(true);
    }
    setShowModal(true);
  }, [user?.id, limitReached]);

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleAdComplete = useCallback(async () => {
    setErrorMsg(null);
    console.log("[FreeTicketEvent] handleAdComplete called - ad finished, granting ticket...");
    try {
      const result = await grantTicket();
      console.log("[FreeTicketEvent] grantTicket OK, result:", result);
      await invalidate();
      queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err: unknown) {
      console.error("[FreeTicketEvent] handleAdComplete error:", err);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to grant ticket";
      const isLimitReached = msg === "DAILY_LIMIT_REACHED";
      const displayMsg = isLimitReached ? "Daily limit reached (17 ads). Come back tomorrow." : msg;
      console.warn("Failed to grant ticket:", err);
      setErrorMsg(displayMsg);
      toast.error(displayMsg);
      if (isLimitReached) {
        await invalidate();
        queryClient.invalidateQueries({ queryKey: TODAY_REWARDED_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      }
      throw err;
    }
  }, [invalidate, queryClient]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={18} className="text-primary" />
        <h3 className="font-display text-sm font-bold text-foreground">Free Tickets</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        Watch a short ad (~20 seconds)
      </p>
      <p className="text-[11px] text-muted-foreground mb-3">
        5→1 · 10→1 · 17→1 tickets (max 17 ads/day)
      </p>

      <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground">Ads watched:</span>
        <span className="font-display text-sm font-bold text-primary">
          {adsWatched}/{maxAds}
        </span>
      </div>

      <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
        <h4 className="text-xs font-semibold text-foreground mb-2">
          🎟 My Tickets
        </h4>
        <p className="text-sm font-bold text-primary">
          {ticketsThisWeek} ticket{ticketsThisWeek !== 1 ? "s" : ""} this week
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          From ads today: {ticketsFromAdsToday} (5→1, 10→1, 17→1)
        </p>
      </div>

      {limitReached && (
        <p className="mb-3 text-xs text-muted-foreground">
          Daily limit reached (17 ads). Come back tomorrow.
        </p>
      )}

      <button
        type="button"
        onClick={handleWatchVideo}
        disabled={showModal || limitReached}
        className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 font-display font-bold text-sm transition-colors ${
          showModal || limitReached
            ? "bg-secondary/50 text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {showModal ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Ticket size={16} />
        )}
        <span>
          {showModal
            ? "Watching..."
            : limitReached
              ? "Daily limit reached"
              : "Watch Video"}
        </span>
      </button>

      {errorMsg && (
        <p className="mt-2 text-[11px] text-destructive">{errorMsg}</p>
      )}

      {showSuccess && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/20 border border-primary/40 py-2 animate-in fade-in">
          <span className="text-sm font-bold text-primary">Ad finished — Ticket earned!</span>
        </div>
      )}

      <RewardedAdModal
        open={showModal}
        onClose={handleModalClose}
        onComplete={handleAdComplete}
        popupBlocked={popupBlocked}
      />
    </div>
  );
}
