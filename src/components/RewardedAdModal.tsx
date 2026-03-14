import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { AD_NETWORKS } from "@/config/adNetworks";

const COUNTDOWN_SECONDS = 20;
const AD_LOAD_FAIL_TIMEOUT_MS = 15000;

interface RewardedAdModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}

/**
 * Monetag rewarded ad modal.
 * Loads single iframe, 20s countdown, then user can close to earn ticket.
 */
export default function RewardedAdModal({ open, onClose, onComplete }: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [canClose, setCanClose] = useState(false);
  const [showTicketEarned, setShowTicketEarned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  const monetagUrl = AD_NETWORKS[0].url;

  useEffect(() => {
    if (!open) return;

    setSecondsLeft(COUNTDOWN_SECONDS);
    setCanClose(false);
    setShowTicketEarned(false);
    setLoadFailed(false);
    setLoading(true);
    isProcessingRef.current = false;

    failTimeoutRef.current = setTimeout(() => {
      setLoadFailed(true);
      setLoading(false);
    }, AD_LOAD_FAIL_TIMEOUT_MS);

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
      if (failTimeoutRef.current) {
        clearTimeout(failTimeoutRef.current);
        failTimeoutRef.current = null;
      }
      clearInterval(timer);
      countdownRef.current = null;
    };
  }, [open]);

  const handleAdLoaded = useCallback(() => {
    setLoading(false);
    setLoadFailed(false);
    if (failTimeoutRef.current) {
      clearTimeout(failTimeoutRef.current);
      failTimeoutRef.current = null;
    }
  }, []);

  const handleClose = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (loadFailed) {
      onClose();
      isProcessingRef.current = false;
      return;
    }

    if (!canClose) {
      isProcessingRef.current = false;
      return;
    }

    try {
      setShowTicketEarned(true);
      await new Promise((r) => setTimeout(r, 600));
      await onComplete();
      onClose();
    } catch (err) {
      console.warn("Reward grant failed:", err);
      onClose();
    } finally {
      isProcessingRef.current = false;
    }
  }, [canClose, loadFailed, onComplete, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      {loadFailed && (
        <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-black/95 p-6">
          <AlertCircle className="h-12 w-12 text-amber-500" />
          <p className="text-center text-sm font-medium text-white">
            No ads available in your region.
          </p>
          <p className="text-center text-xs text-white/70">
            This app targets Indonesia. Ads may not load from other countries. Try again later or use a VPN.
          </p>
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-lg bg-primary px-6 py-2 font-bold text-primary-foreground"
          >
            Close
          </button>
        </div>
      )}
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

      <div className="flex-1 relative min-h-0 overflow-hidden">
        {loading && !loadFailed && (
          <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center gap-4 bg-black">
            <Loader2 className="h-14 w-14 animate-spin text-primary" />
            <p className="text-base font-medium text-white animate-pulse">Loading ad...</p>
            <p className="text-xs text-white/60">Monetag</p>
          </div>
        )}
        <iframe
          src={open ? monetagUrl : undefined}
          title="Monetag"
          className="absolute inset-0 w-full h-full border-0"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            visibility: loading && !loadFailed ? "hidden" : "visible",
          }}
          sandbox="allow-scripts allow-same-origin allow-popups"
          onLoad={handleAdLoaded}
        />
      </div>

      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-black/95 border-t border-white/10">
        <span className="text-sm text-white/90">
          {loadFailed ? (
            "No ads in your region — tap Close"
          ) : canClose ? (
            "Tap Close to earn your ticket"
          ) : (
            <>Close in <span className="font-bold text-primary">{secondsLeft}</span>s</>
          )}
        </span>
        <button
          type="button"
          onClick={handleClose}
          disabled={!canClose && !loadFailed}
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
