import { useState, useEffect, useRef, useCallback } from "react";
import { X, ExternalLink, Speaker, Info, Loader2, Gamepad2, ShoppingBag, Utensils } from "lucide-react";

interface RewardedAdModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}

const AD_DURATION = 8;
const TOTAL_ADS = 3;

const AD_THEMES = [
  {
    gradient: "linear-gradient(135deg, #ea580c, #dc2626)",
    icon: <Gamepad2 size={40} className="text-white/80" />,
    title: "Epic Dragons RPG",
    subtitle: "Play for free and summon legendary heroes!",
    cta: "Install Now",
    buttonColor: "#059669"
  },
  {
    gradient: "linear-gradient(135deg, #d946ef, #9333ea)",
    icon: <ShoppingBag size={40} className="text-white/80" />,
    title: "Flash Sale Live!",
    subtitle: "Get up to 99% cashback on your first purchase.",
    cta: "Shop Now",
    buttonColor: "#eab308"
  },
  {
    gradient: "linear-gradient(135deg, #16a34a, #0ea5e9)",
    icon: <Utensils size={40} className="text-white/80" />,
    title: "Hungry? We Deliver fast.",
    subtitle: "50% Off your first food delivery order.",
    cta: "Order Food",
    buttonColor: "#1e40af"
  }
];

export default function RewardedAdModal({
  open,
  onClose,
  onComplete,
}: RewardedAdModalProps) {
  const [currentAd, setCurrentAd] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION);
  const [isFinished, setIsFinished] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prevent multiple rapid clicks causing double grants
  const hasGrantedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setCurrentAd(1);
      setSecondsLeft(AD_DURATION);
      setIsFinished(false);
      setIsProcessing(false);
      hasGrantedRef.current = false;
      return;
    }

    setSecondsLeft(AD_DURATION);
    setIsFinished(false);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownRef.current = timer;

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [open, currentAd]);

  const handleNextOrClose = useCallback(async () => {
    if (!isFinished || isProcessing) return;

    if (currentAd < TOTAL_ADS) {
      // Advance to next ad
      setCurrentAd((prev) => prev + 1);
    } else {
      // Sequence completed fully
      if (hasGrantedRef.current) return;
      hasGrantedRef.current = true;
      setIsProcessing(true);

      if (countdownRef.current) clearInterval(countdownRef.current);
      
      try {
        await onComplete();
        setTimeout(() => {
          onClose(); // Auto close slightly after success
        }, 800);
      } catch (err) {
        console.error("Reward grant failed:", err);
        hasGrantedRef.current = false;
        onClose(); // Fail safely without locking
      } finally {
        setIsProcessing(false);
      }
    }
  }, [currentAd, isFinished, isProcessing, onComplete, onClose]);

  if (!open) return null;

  const currentTheme = AD_THEMES[currentAd - 1];
  const progressPercent = ((AD_DURATION - secondsLeft) / AD_DURATION) * 100;

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col justify-between">
      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-col pt-[var(--safe-area-top,0px)]">
        {/* Progress Bar overall */}
        <div className="h-1.5 w-full bg-white/10">
          <div 
            className="h-full bg-[#3b82f6] transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Sponsored</span>
              <Info size={12} className="text-white/60" />
            </div>
            <div className="bg-black/40 backdrop-blur border border-white/10 rounded-full px-3 py-1">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Ad {currentAd} of {TOTAL_ADS}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="bg-black/30 backdrop-blur border border-white/10 rounded-full p-2">
              <Speaker size={14} className="text-white/60" />
            </button>
            <div className={`h-10 px-3 flex items-center justify-center rounded-full bg-black/50 backdrop-blur border border-white/20 transition-all ${isFinished ? 'opacity-100' : 'opacity-80'}`}>
               {!isFinished ? (
                 <span className="text-xs font-bold text-whitetabular-nums text-white/80">
                   Reward in {secondsLeft}
                 </span>
               ) : (
                 <button onClick={handleNextOrClose} className="flex items-center justify-center p-1">
                   <X size={18} className="text-white drop-shadow-md" />
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Simulated Video Container ── */}
      <div 
        key={currentAd}
        className="absolute inset-0 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500"
        style={{ background: currentTheme.gradient }}
      >
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

        <div className="relative z-10 flex flex-col items-center justify-center max-w-sm text-center">
          {/* Mock Video Playing Graphic */}
          <div className="w-24 h-24 rounded-3xl bg-black/20 backdrop-blur shadow-2xl flex items-center justify-center mb-6 animate-pulse" 
               style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
            {currentTheme.icon}
          </div>

          <h2 className="text-3xl font-black text-white mb-3 tracking-tight drop-shadow-lg leading-tight">
            {currentTheme.title}
          </h2>
          <p className="text-white/90 text-sm mb-10 max-w-[250px] mx-auto drop-shadow-md">
            {currentTheme.subtitle}
          </p>

          <button 
            className="w-full max-w-[200px] h-14 rounded-full flex items-center justify-center gap-2 font-black text-white shadow-2xl text-lg hover:scale-105 transition-transform"
            style={{ 
              background: currentTheme.buttonColor,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)"
            }}
          >
            {currentTheme.cta}
            <ExternalLink size={18} />
          </button>
          
          <div className="mt-8 flex items-center gap-2 text-white/50 text-xs font-medium bg-black/20 px-4 py-2 rounded-full border border-white/5">
            <Loader2 size={12} className="animate-spin" />
            Simulating Video Playback...
          </div>
        </div>
      </div>

      {/* ── Bottom Overlay (Only shows when playing) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 flex justify-center pb-[calc(1.5rem+var(--safe-area-bottom,0px))]">
        {!isFinished ? (
          <p className="text-xs text-white/50 bg-black/60 backdrop-blur rounded-full px-5 py-2">
            Skip unavailable
          </p>
        ) : (
          <button 
            onClick={handleNextOrClose}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 w-full max-w-sm rounded-2xl bg-white text-black font-bold h-14 shadow-2xl disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 size={18} className="animate-spin text-black/50" /> Awarding Ticket...</>
            ) : currentAd < TOTAL_ADS ? (
              "Next Ad"
            ) : (
              "Claim Ticket"
            )}
          </button>
        )}
      </div>

    </div>
  );
}
