import { useState, useCallback } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { grantTicket } from "@/hooks/useRewardedAdTickets";
import RewardedAdModal from "@/components/RewardedAdModal";
import { toast } from "sonner";
import { AD_NETWORKS } from "@/config/adNetworks";

/**
 * Free Ticket Event - Monetag rewarded ad (popup).
 * Watch ad → Close → grant_ticket RPC → ticket earned.
 */
export default function FreeTicketEvent() {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ticketsEarned, setTicketsEarned] = useState(0);

  const handleWatchVideo = useCallback(() => {
    if (!user?.id) {
      toast.error("Please log in to earn tickets");
      return;
    }
    setErrorMsg(null);
    setPopupBlocked(false);

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
  }, [user?.id]);

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleAdComplete = useCallback(async () => {
    setErrorMsg(null);
    try {
      await grantTicket();
      setTicketsEarned((n) => n + 1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to grant ticket";
      console.warn("Failed to grant ticket:", err);
      setErrorMsg(msg);
      toast.error(msg);
      throw err;
    }
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={18} className="text-primary" />
        <h3 className="font-display text-sm font-bold text-foreground">Free Tickets</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        Watch a short ad (~20 seconds)
      </p>
      <p className="text-[11px] text-muted-foreground mb-1">
        Earn 1 ticket
      </p>
      <p className="text-[11px] text-muted-foreground mb-3">
        Daily limit: 5 tickets
      </p>

      <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground">Tickets earned today:</span>
        <span className="font-display text-sm font-bold text-primary">
          {ticketsEarned}
        </span>
      </div>

      <button
        type="button"
        onClick={handleWatchVideo}
        disabled={showModal}
        className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 font-display font-bold text-sm transition-colors ${
          showModal
            ? "bg-secondary/50 text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {showModal ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Ticket size={16} />
        )}
        <span>{showModal ? "Watching..." : "Watch Video"}</span>
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
