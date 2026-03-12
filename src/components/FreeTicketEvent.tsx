import { useState, useEffect } from "react";
import { Ticket } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useAdTicketEvents, getCurrentEvent } from "@/hooks/useAdTicketEvents";

/**
 * Free Ticket Event section - rewarded video ads for lottery tickets.
 * Events: Wed 20:00-21:00 (max 3), Sun 20:00-21:00 (max 5) Asia/Jakarta.
 *
 * Ad integration: Replace watchAd() with actual AdMob/AppLovin rewarded ad.
 * Use AdMob mediation for highest CPM.
 */
export default function FreeTicketEvent() {
  const { user } = useUser();
  const { earnedCount, isLoading, event, earnTicket } = useAdTicketEvents(user?.id);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const tick = () => {
      const ev = getCurrentEvent();
      if (ev.active && ev.endsInMs != null) {
        const remaining = Math.max(0, ev.endsInMs);
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdown(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        );
      } else if (!ev.active && ev.startsInMs != null) {
        const remaining = Math.max(0, ev.startsInMs);
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdown(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        );
      } else {
        setCountdown(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [event.active, event.endsInMs, event.startsInMs]);

  const handleWatchVideo = async () => {
    if (!user?.id || !event.active || earnedCount >= event.maxTickets) return;

    try {
      await watchAd();
      await earnTicket.mutateAsync();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error("Ad or earn failed:", err);
    }
  };

  const canWatch = event.active && earnedCount < event.maxTickets && !earnTicket.isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={18} className="text-primary" />
        <h3 className="font-display text-sm font-bold text-foreground">Free Tickets</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Watch ads and earn tickets for the weekly reward draw.
      </p>

      <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground">Tickets earned today:</span>
        <span className="font-display text-sm font-bold text-primary">
          {isLoading ? "..." : `${earnedCount} / ${event.maxTickets}`}
        </span>
      </div>

      {!event.active && countdown && (
        <p className="text-[11px] text-muted-foreground mb-3">
          Free Ticket Event starts in {countdown}
        </p>
      )}

      {event.active && countdown && (
        <p className="text-[11px] text-primary font-medium mb-3">
          Event ends in {countdown}
        </p>
      )}

      <button
        onClick={handleWatchVideo}
        disabled={!canWatch}
        className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 font-display font-bold text-sm transition-colors ${
          canWatch
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
        }`}
      >
        <Ticket size={16} />
        <span>Watch Video</span>
      </button>

      {showSuccess && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/20 border border-primary/40 py-2 animate-in fade-in">
          <span className="text-sm font-bold text-primary">🎟 Ticket earned!</span>
        </div>
      )}
    </div>
  );
}

/**
 * Placeholder for rewarded video ad.
 * Replace with actual AdMob/AppLovin integration:
 * - Use react-native-google-mobile-ads or similar for mobile
 * - Use Google Publisher Tag for web
 * - AdMob mediation for AppLovin fallback
 */
async function watchAd(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 1500);
  });
}
