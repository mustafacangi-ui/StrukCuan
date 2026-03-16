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
 * We open the ad in a popup, show countdown. When user clicks "Close & Claim Ticket",
 * onComplete is called (RPC) and modal must NOT close until onComplete finishes.
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
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

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
      await onCompleteRef.current();
      setShowTicketEarned(true);
      await new Promise((r) => setTimeout(r, 1500));
      onClose();
    } catch (err) {
      console.warn("Reward grant failed:", err);
      completionFiredRef.current = false;
      onClose();
    } finally {
      setIsProcessing(false);
    }
  }, [canClose, isProcessing, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        {showTicketEarned && (
          <div className="flex flex-col items-center gap-3 px-6 py-6">
            <span className="text-3xl">🎟</span>
            <p className="font-display text-lg font-bold text-[#22c55e] text-center">
              Ad finished — Ticket earned!
            </p>
          </div>
        )}

        {!showTicketEarned && (
          <div className="flex flex-col items-center gap-6 px-6 py-8">
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
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-bold text-black"
                  style={{ background: "#facc15" }}
                >
                  <ExternalLink size={18} />
                  Open Ad in New Tab
                </a>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-[#facc15]" />
                <p className="text-center text-sm font-medium text-white">
                  Watching ad...
                </p>
                <p className="text-center text-lg font-bold text-[#facc15]">
                  Reward unlocks in: {secondsLeft}s
                </p>
              </>
            )}
          </div>
        )}

        {!showTicketEarned && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-white/10">
            <span className="text-sm text-white/90">
              {canClose ? (
                "Tap the button to claim your ticket"
              ) : (
                <>Reward unlocks in: <span className="font-bold text-[#facc15]">{secondsLeft}s</span></>
              )}
            </span>
            <button
              type="button"
              onClick={handleClose}
              disabled={!canClose || isProcessing}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-display font-bold text-sm transition-colors ${
                canClose
                  ? "bg-[#facc15] text-black hover:opacity-90"
                  : "bg-white/20 text-white/50 cursor-not-allowed"
              }`}
            >
              {isProcessing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <X size={18} />
              )}
              {canClose ? "Close & Claim Ticket" : "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
