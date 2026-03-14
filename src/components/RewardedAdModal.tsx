import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";
import { AD_NETWORKS } from "@/config/adNetworks";

const COUNTDOWN_SECONDS = 20;

interface RewardedAdModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
  /** True if popup was blocked - show manual link */
  popupBlocked?: boolean;
}

/**
 * Monetag rewarded ad modal.
 * Monetag omg10.com links are redirect/popunder - they do NOT work in iframes.
 * We open the ad in a popup, show countdown, grant ticket when user closes.
 */
export default function RewardedAdModal({
  open,
  onClose,
  onComplete,
  popupBlocked = false,
}: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [canClose, setCanClose] = useState(false);
  const [showTicketEarned, setShowTicketEarned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionFiredRef = useRef(false);

  const monetagUrl = AD_NETWORKS[0].url;

  useEffect(() => {
    if (!open) return;

    setSecondsLeft(COUNTDOWN_SECONDS);
    setCanClose(false);
    setShowTicketEarned(false);
    setIsProcessing(false);
    completionFiredRef.current = false;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownRef.current = timer;

    return () => {
      clearInterval(timer);
      countdownRef.current = null;
    };
  }, [open]);

  const handleClose = useCallback(async () => {
    if (isProcessing || completionFiredRef.current) return;
    if (!canClose) return;

    setIsProcessing(true);
    completionFiredRef.current = true;

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    try {
      setShowTicketEarned(true);
      await new Promise((r) => setTimeout(r, 600));
      await onComplete();
      onClose();
    } catch (err) {
      console.warn("Reward grant failed:", err);
      completionFiredRef.current = false;
      onClose();
    } finally {
      setIsProcessing(false);
    }
  }, [canClose, isProcessing, onComplete, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      {showTicketEarned && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/95 animate-in fade-in">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary/20 border-2 border-primary px-8 py-6">
            <span className="text-2xl">🎟</span>
            <p className="font-display text-lg font-bold text-primary text-center">
              Ad finished — Ticket earned!
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        {popupBlocked ? (
          <>
            <p className="text-center text-sm font-medium text-white">
              Your browser blocked the ad popup.
            </p>
            <p className="text-center text-xs text-white/70">
              Tap the button below to open the ad in a new tab. Watch it, then return here and tap Close.
            </p>
            <a
              href={monetagUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground"
            >
              <ExternalLink size={18} />
              Open Ad in New Tab
            </a>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-center text-sm font-medium text-white">
              Ad opened in new window
            </p>
            <p className="text-center text-xs text-white/70">
              Watch the ad for 20 seconds, then return here and tap Close to earn your ticket.
            </p>
          </>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-black/95 border-t border-white/10">
        <span className="text-sm text-white/90">
          {canClose ? (
            "Tap Close to earn your ticket"
          ) : (
            <>Close in <span className="font-bold text-primary">{secondsLeft}</span>s</>
          )}
        </span>
        <button
          type="button"
          onClick={handleClose}
          disabled={!canClose || isProcessing}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-display font-bold text-sm transition-colors ${
            canClose
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-white/20 text-white/50 cursor-not-allowed"
          }`}
        >
          <X size={18} />
          Close
        </button>
      </div>
    </div>
  );
}
