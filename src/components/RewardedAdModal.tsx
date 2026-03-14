import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { adNetworks } from "@/config/adNetworks";

const COUNTDOWN_SECONDS = 20;
const AD_LOAD_TIMEOUT_MS = 5000;

interface RewardedAdModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}

/**
 * Hybrid ad mediation: loads Adsterra, Monetag, PropellerAds in parallel.
 * First to load within 5s wins. If current fails, try next. No redirect.
 */
export default function RewardedAdModal({ open, onClose, onComplete }: RewardedAdModalProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canClose, setCanClose] = useState(false);
  const [showTicketEarned, setShowTicketEarned] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const currentIndexRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  currentIndexRef.current = currentIndex;
  const currentNetwork = adNetworks[currentIndex];

  const handleAdLoaded = useCallback((name: string) => {
    loadedIdsRef.current.add(name);
    setWinnerId((prev) => {
      if (prev) return prev;
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return name;
    });
  }, []);

  const tryNextNetwork = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx >= adNetworks.length - 1) {
      setLoading(false);
      setWinnerId(adNetworks[0].name);
      return;
    }
    const nextIndex = idx + 1;
    const next = adNetworks[nextIndex];
    setCurrentIndex(nextIndex);
    setWinnerId(next.name);
    setLoading(false);
    if (loadedIdsRef.current.has(next.name)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      timeoutRef.current = setTimeout(tryNextNetwork, AD_LOAD_TIMEOUT_MS);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    loadedIdsRef.current.clear();
    currentIndexRef.current = 0;
    setCountdown(COUNTDOWN_SECONDS);
    setCanClose(false);
    setShowTicketEarned(false);
    setCurrentIndex(0);
    setWinnerId(null);
    setLoading(true);

    timeoutRef.current = setTimeout(tryNextNetwork, AD_LOAD_TIMEOUT_MS);

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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [open, tryNextNetwork]);

  const handleClose = useCallback(async () => {
    if (!canClose) return;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setShowTicketEarned(true);
    await new Promise((r) => setTimeout(r, 800));
    try {
      await onComplete();
      onClose();
    } catch {
      onClose();
    }
  }, [canClose, onComplete, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
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
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-white/90 animate-pulse">Loading ad...</p>
            <p className="text-xs text-white/60">Trying {currentNetwork?.name}...</p>
          </div>
        )}
        {adNetworks.map(({ name, url }) => (
          <iframe
            key={name}
            src={open ? url : undefined}
            title={name}
            className="absolute inset-0 w-full h-full border-0"
            style={{
              zIndex: winnerId === name ? 2 : 1,
              visibility: !loading && winnerId === name ? "visible" : "hidden",
            }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            onLoad={() => handleAdLoaded(name)}
          />
        ))}
      </div>

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
