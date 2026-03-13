import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { AD_NETWORK_URLS } from "@/config/adNetworks";

const COUNTDOWN_SECONDS = 20;

interface RewardedAdModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}

/**
 * Fullscreen modal that loads rewarded ads via iframe.
 * Mediation: tries Monetag, Adsterra, PropellerAds - whichever loads first displays.
 * 20 second countdown, then close button enables. On close, grants ticket.
 */
export default function RewardedAdModal({ open, onClose, onComplete }: RewardedAdModalProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canClose, setCanClose] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAdLoaded = useCallback((id: string) => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setWinnerId(id);
    setLoading(false);
  }, []);

  const handleClose = useCallback(async () => {
    if (!canClose) return;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    try {
      await onComplete();
      onClose();
    } catch {
      onClose();
    }
  }, [canClose, onComplete, onClose]);

  useEffect(() => {
    if (!open) return;

    loadedRef.current = false;
    setCountdown(COUNTDOWN_SECONDS);
    setCanClose(false);
    setWinnerId(null);
    setLoading(true);

    // Fallback: if no ad loads in 8s, show first network (Monetag)
    const fallbackTimer = setTimeout(() => {
      if (!loadedRef.current) {
        loadedRef.current = true;
        setWinnerId(AD_NETWORK_URLS[0].id);
        setLoading(false);
      }
    }, 8000);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(fallbackTimer);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* Ad container - mediation: all iframes load in parallel, first to load displays on top */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
            <p className="text-sm text-white/80 animate-pulse">Loading ad...</p>
          </div>
        )}
        {AD_NETWORK_URLS.map(({ id, url }) => (
          <iframe
            key={id}
            src={open ? url : undefined}
            title={id}
            className="absolute inset-0 w-full h-full border-0"
            style={{
              zIndex: winnerId === id ? 2 : 1,
              visibility: !loading && winnerId === id ? "visible" : "hidden",
            }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            onLoad={() => handleAdLoaded(id)}
          />
        ))}
      </div>

      {/* Bottom bar: countdown + close button */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-black/95 border-t border-white/10">
        <span className="text-sm text-white/90">
          {canClose ? (
            "Tap Close to earn your ticket"
          ) : (
            <>Close in <span className="font-bold text-primary">{countdown}</span>s</>
          )}
        </span>
        <button
          type="button"
          onClick={handleClose}
          disabled={!canClose}
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
