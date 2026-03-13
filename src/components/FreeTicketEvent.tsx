import { useState, useEffect, useRef } from "react";
import { Ticket } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useMonetagAdTickets } from "@/hooks/useMonetagAdTickets";

const MONETAG_AD_URL = "https://omg10.com/4/10726900";
const WAIT_AFTER_RETURN_MS = 5000;

/**
 * Free Ticket Event - Monetag Direct Ad integration.
 * Users watch ads and earn tickets. Daily limit: 5.
 */
export default function FreeTicketEvent() {
  const { user } = useUser();
  const { earnedCount, isLoading, maxPerDay, earnTicket, refetch } = useMonetagAdTickets(user?.id);
  const [showSuccess, setShowSuccess] = useState(false);
  const [adOpened, setAdOpened] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const grantTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  const handleWatchVideo = () => {
    if (!user?.id || earnedCount >= maxPerDay || adOpened) return;

    setAdOpened(true);
    window.open(MONETAG_AD_URL, "_blank");
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!adOpened || !user?.id || isProcessingRef.current) return;
      if (grantTimeoutRef.current) return;
      if (earnedCount >= maxPerDay) {
        setAdOpened(false);
        return;
      }

      grantTimeoutRef.current = setTimeout(() => {
        grantTimeoutRef.current = null;
        isProcessingRef.current = true;
        setAdOpened(false);
        setIsGranting(true);

        earnTicket
          .mutateAsync()
          .then(() => {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
            refetch();
          })
          .catch(() => {})
          .finally(() => {
            isProcessingRef.current = false;
            setIsGranting(false);
          });
      }, WAIT_AFTER_RETURN_MS);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (grantTimeoutRef.current) {
        clearTimeout(grantTimeoutRef.current);
        grantTimeoutRef.current = null;
      }
    };
  }, [adOpened, user?.id, earnedCount, maxPerDay, earnTicket, refetch]);

  useEffect(() => {
    if (!adOpened) return;
    const fallback = setTimeout(() => {
      setAdOpened(false);
      if (grantTimeoutRef.current) {
        clearTimeout(grantTimeoutRef.current);
        grantTimeoutRef.current = null;
      }
    }, 180_000);
    return () => clearTimeout(fallback);
  }, [adOpened]);

  const atLimit = earnedCount >= maxPerDay;
  const canWatch = !atLimit && !adOpened && !earnTicket.isPending && !isGranting;

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
          {isLoading ? "..." : `${earnedCount} / ${maxPerDay}`}
        </span>
      </div>

      {atLimit && (
        <p className="text-[11px] text-muted-foreground mb-3">
          You&apos;ve reached today&apos;s limit. Come back tomorrow for more!
        </p>
      )}

      {adOpened && (
        <p className="text-[11px] text-primary font-medium mb-3">
          Watch the ad, then return here to earn your ticket.
        </p>
      )}

      {isGranting && (
        <p className="text-[11px] text-primary font-medium mb-3">
          Granting ticket...
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
        <span>{adOpened || isGranting ? "Watching..." : "Watch Video"}</span>
      </button>

      {showSuccess && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/20 border border-primary/40 py-2 animate-in fade-in">
          <span className="text-sm font-bold text-primary">🎟 Ticket earned!</span>
        </div>
      )}
    </div>
  );
}
