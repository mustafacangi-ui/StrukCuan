import { useState } from "react";
import { Ticket } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useRewardedAdTickets } from "@/hooks/useRewardedAdTickets";
import RewardedAdModal from "@/components/RewardedAdModal";

/**
 * Free Ticket Event - Hybrid rewarded ad system.
 * In-page modal with iframe. Mediation: Monetag → Adsterra → PropellerAds.
 * Daily limit: 5 ads per user.
 */
export default function FreeTicketEvent() {
  const { user } = useUser();
  const { earnedCount, isLoading, maxPerDay, earnTicket, refetch } = useRewardedAdTickets(user?.id);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleWatchVideo = () => {
    if (!user?.id || earnedCount >= maxPerDay) return;
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleAdComplete = async () => {
    try {
      await earnTicket.mutateAsync();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      refetch();
    } catch {
      setShowModal(false);
    }
  };

  const atLimit = earnedCount >= maxPerDay;
  const canWatch = !atLimit && !showModal && !earnTicket.isPending;

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
        Daily limit: {maxPerDay} tickets
      </p>

      <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground">Tickets earned today:</span>
        <span className="font-display text-sm font-bold text-primary">
          {isLoading ? "..." : `${earnedCount} / ${maxPerDay}`}
        </span>
      </div>

      {atLimit && (
        <p className="text-[11px] text-muted-foreground mb-3">
          You&apos;ve reached today&apos;s limit. Come back tomorrow for more!
        </p>
      )}

      <button
        type="button"
        onClick={handleWatchVideo}
        disabled={!canWatch}
        className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 font-display font-bold text-sm transition-colors ${
          canWatch
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
        }`}
      >
        <Ticket size={16} />
        <span>{showModal ? "Watching..." : "Watch Video"}</span>
      </button>

      {showSuccess && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/20 border border-primary/40 py-2 animate-in fade-in">
          <span className="text-sm font-bold text-primary">🎟 Ticket earned!</span>
        </div>
      )}

      <RewardedAdModal
        open={showModal}
        onClose={handleModalClose}
        onComplete={handleAdComplete}
      />
    </div>
  );
}
