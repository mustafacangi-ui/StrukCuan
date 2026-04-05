import { useState, useCallback, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Smartphone, Ticket, Flame, Trophy } from "lucide-react";
import { toast } from "sonner";
import { shakeToWin } from "@/hooks/useShakeToWin";
import { useShakeDetection, requestShakePermission, isShakeSupported } from "@/hooks/useShakeDetection";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";
import { pad } from "@/lib/weeklyCountdown";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface LuckyShakeCardProps {
  countdown: CountdownState;
  countdownReady: boolean;
  userId: string | undefined;
  isWeeklyLimitReached: boolean;
}

export default function LuckyShakeCard({
  countdown,
  countdownReady,
  userId,
  isWeeklyLimitReached,
}: LuckyShakeCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [shakeLoading, setShakeLoading] = useState(false);
  const [shakeModalOpen, setShakeModalOpen] = useState(false);
  const [shakeWonTickets, setShakeWonTickets] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [progressFill, setProgressFill] = useState(false);

  // Fetch shake statistics
  const { data: userStats, refetch: refetchStats } = useQuery({
    queryKey: ["user_stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from('user_stats').select('shake_last_at, shake_total_tickets, shake_streak, shake_last_reward').eq('user_id', userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Check if shake is ready today in Jakarta time
  const [shakeRightAvailable, setShakeRightAvailable] = useState(false);

  useEffect(() => {
    if (!countdownReady || !userStats) {
       // Fall back logic if stats missing but countdown hits 0 (edge case)
       if (countdownReady && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0 && countdown.days === 0) {
         setShakeRightAvailable(true);
       }
       return;
    }
    
    // Validate if last_shake_at is from a previous Jakarta day
    if (userStats.shake_last_at) {
      const jakartaTimeNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const jakartaTimeLast = new Date(new Date(userStats.shake_last_at).toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      
      const isSameJakartaDay = 
        jakartaTimeNow.getFullYear() === jakartaTimeLast.getFullYear() &&
        jakartaTimeNow.getMonth() === jakartaTimeLast.getMonth() &&
        jakartaTimeNow.getDate() === jakartaTimeLast.getDate();
        
      setShakeRightAvailable(!isSameJakartaDay);
    } else {
      setShakeRightAvailable(true);
    }
  }, [countdownReady, countdown, userStats]);

  // Unlock exactly at midnight transition
  const isCountdownZero = (countdown?.days ?? 0) === 0 && (countdown?.hours ?? 0) === 0 && (countdown?.minutes ?? 0) === 0 && (countdown?.seconds ?? 0) === 0;
  useEffect(() => {
    if (countdownReady && isCountdownZero) setShakeRightAvailable(true);
  }, [countdownReady, isCountdownZero]);

  const triggerShakeAnimation = () => {
    setIsShaking(true);
    setProgressFill(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleShake = useCallback(async () => {
    if (shakeLoading || !userId) return;
    if (!shakeRightAvailable) {
      toast.error(t("shake.toast.waitCountdown"));
      return;
    }
    setShakeLoading(true);
    setShakeWonTickets(null);
    triggerShakeAnimation();
    
    try {
      const result = await shakeToWin();
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
        invalidateLotteryPoolQueries(queryClient);
        refetchStats(); // Refresh DB stats
        
        setShakeLoading(false);
        setShakeWonTickets(result.ticketsAdded ?? 1);
        setShakeRightAvailable(false);

        // Hardware Vibration & Confetti
        if (navigator.vibrate) navigator.vibrate([200, 100, 300, 100, 500]);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#a855f7", "#ec4899", "#4ade80", "#eab308"], zIndex: 1000 });
      } else {
        const errMsg = result?.error ?? "FAILED";
        if (errMsg === "SHAKE_ALREADY_USED") {
          toast.error(t("shake.toast.alreadyUsed"));
          setShakeRightAvailable(false);
        } else {
          toast.error(errMsg);
        }
        setShakeLoading(false);
      }
    } catch (err) {
      console.error("[LuckyShake] error:", err);
      toast.error(t("shake.toast.failed"));
      setShakeLoading(false);
    }
  }, [shakeLoading, userId, queryClient, shakeRightAvailable, t, refetchStats]);

  useShakeDetection({
    onShake: handleShake,
    enabled: shakeModalOpen && shakeWonTickets == null,
  });

  const handleOpenShake = async () => {
    try {
      if (!userId) { toast.error(t("shake.toast.loginToPlay")); return; }
      if (!shakeRightAvailable) {
        toast.error("Next shake unlocks at midnight Jakarta time");
        return;
      }
      if (!isShakeSupported()) { toast.error(t("shake.toast.unsupportedDevice")); return; }
      const granted = await requestShakePermission();
      if (!granted) { toast.error(t("shake.toast.sensorPermission")); return; }
      setShakeWonTickets(null);
      setProgressFill(false);
      setShakeModalOpen(true);
    } catch (err) {
      console.error("[LuckyShake] open error:", err);
      toast.error(t("shake.toast.failed"));
    }
  };

  const [isTicketPreview, setIsTicketPreview] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setIsTicketPreview((p) => !p), 4000);
    return () => clearInterval(id);
  }, []);

  const countdownBlocks = [
    { val: pad(countdown?.hours ?? 0), label: t("time.hours").slice(0, 2).toUpperCase() },
    { val: pad(countdown?.minutes ?? 0), label: t("time.min").slice(0, 2).toUpperCase() },
    { val: pad(countdown?.seconds ?? 0), label: t("time.sec").slice(0, 2).toUpperCase() },
  ];

  const cardAnimStyle: CSSProperties = isShaking ? { animation: "card-shake 0.55s ease-in-out forwards" } : {};

  return (
    <>
      <div
        className="relative overflow-hidden rounded-3xl p-5 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-300 ease-out hover:scale-[1.02] animate-shake-mount"
        style={cardAnimStyle}
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-700/8 via-transparent to-indigo-900/8" />

        <div className="flex items-start gap-3 mb-4 relative z-10">
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-breathing-glow" style={{ background: "#0a0a0c", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="absolute inset-0 rounded-2xl opacity-60" style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(168,85,247,0.35) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 rounded-2xl opacity-40" style={{ background: "radial-gradient(ellipse at 70% 70%, rgba(236,72,153,0.3) 0%, transparent 65%)" }} />
            
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-700" style={{ opacity: isTicketPreview ? 0 : 1 }}>
              <svg viewBox="0 0 36 60" width="26" height="26" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.7))" }}>
                <rect x="3" y="1" width="30" height="58" rx="5" />
                <line x1="13" y1="6" x2="23" y2="6" strokeWidth="2" />
                <rect x="6" y="10" width="24" height="38" rx="1.5" strokeWidth="1" stroke="rgba(255,255,255,0.5)" />
                <circle cx="18" cy="54" r="2.5" />
              </svg>
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-700" style={{ opacity: isTicketPreview ? 1 : 0, animation: isTicketPreview ? "ticket-breathe 3s ease-in-out infinite" : "none" }}>
              <svg viewBox="0 0 80 46" width="44" height="44" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.9)) drop-shadow(0 0 12px rgba(236,72,153,0.6))" }}>
                <rect x="2" y="3" width="76" height="40" rx="3" stroke="rgba(216,180,254,0.9)" strokeWidth="1.2" />
                <path d="M2 12 Q2 3 11 3" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                <path d="M78 12 Q78 3 69 3" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                <path d="M2 34 Q2 43 11 43" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                <path d="M78 34 Q78 43 69 43" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                <path d="M2 19 Q-4 23 2 27" stroke="rgba(216,180,254,0.9)" strokeWidth="1.2" fill="none" />
                <path d="M78 19 Q84 23 78 27" stroke="rgba(216,180,254,0.9)" strokeWidth="1.2" fill="none" />
                <line x1="26" y1="3" x2="26" y2="43" stroke="rgba(168,85,247,0.6)" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
                <line x1="6" y1="15" x2="22" y2="15" stroke="rgba(216,180,254,0.5)" strokeWidth="0.8" />
                <line x1="6" y1="23" x2="22" y2="23" stroke="rgba(216,180,254,0.5)" strokeWidth="0.8" />
                <line x1="6" y1="31" x2="22" y2="31" stroke="rgba(216,180,254,0.5)" strokeWidth="0.8" />
                <line x1="38" y1="14" x2="72" y2="14" stroke="rgba(255,255,255,0.95)" strokeWidth="2.2" />
                <line x1="55" y1="14" x2="55" y2="36" stroke="rgba(255,255,255,0.95)" strokeWidth="2.2" />
                <polygon points="55,11 58,14 55,17 52,14" fill="none" stroke="rgba(236,72,153,0.85)" strokeWidth="0.8" />
                <circle cx="38" cy="14" r="1.2" fill="rgba(168,85,247,0.9)" />
                <circle cx="72" cy="14" r="1.2" fill="rgba(168,85,247,0.9)" />
                <circle cx="55" cy="36" r="1.2" fill="rgba(168,85,247,0.9)" />
              </svg>
            </div>
            <div className="absolute bottom-1 right-1 flex gap-0.5">
              <div className={`w-1 h-1 rounded-full transition-all duration-500 ${!isTicketPreview ? "bg-white/80" : "bg-white/25"}`} />
              <div className={`w-1 h-1 rounded-full transition-all duration-500 ${isTicketPreview ? "bg-[#a855f7]" : "bg-white/25"}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-base leading-tight tracking-tight">Daily Lucky Shake</h3>
            <p className="text-[11px] text-white/50 mt-0.5 break-words line-clamp-2">Win up to 5x random tickets every day</p>
            <p className="text-[10px] font-bold mt-1 text-purple-400 border border-purple-500/30 bg-purple-500/10 inline-flex px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(168,85,247,0.4)]">
              Resets 00:00 WIB
            </p>
          </div>
        </div>

        {/* Shake availability indicator */}
        <div className="mb-3 relative z-10 flex items-center justify-between">
          {shakeRightAvailable ? (
            <p className="text-xs font-bold text-[#4ade80] drop-shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse">Shake Available Now!</p>
          ) : (
            <p className="text-[10px] font-medium text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]">Next unlock at midnight Jakarta time</p>
          )}
        </div>

        {/* Countdown boxes (Show only when locked) */}
        {!shakeRightAvailable && countdownReady && (
          <div className="mb-4 relative z-10 animate-fade-in">
            <div className="flex gap-2">
              {countdownBlocks.map((block) => (
                <div key={block.label} className="flex-1 flex flex-col items-center rounded-xl bg-white/[0.02] border border-white/5 py-2 px-1">
                  <span className="font-display text-[15px] font-bold text-white/60 tabular-nums leading-none">{block.val}</span>
                  <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest mt-1">{block.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Stats Panel */}
        <div className="flex items-center gap-2 mb-4 relative z-10 mt-2 border-t border-white/10 pt-3 opacity-90">
           <div className="flex-1 flex items-center gap-2 bg-black/40 rounded-xl p-2 border border-white/5">
              <Flame size={14} className={userStats?.shake_streak && userStats.shake_streak > 0 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "text-zinc-600"} />
              <div>
                 <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Streak</p>
                 <p className="text-xs font-bold text-white tabular-nums">{userStats?.shake_streak || 0} <span className="text-[10px] text-zinc-400 font-medium">Days</span></p>
              </div>
           </div>
           <div className="flex-1 flex items-center gap-2 bg-black/40 rounded-xl p-2 border border-white/5">
              <Trophy size={14} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              <div>
                 <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Total Won</p>
                 <p className="text-xs font-bold text-white tabular-nums">{userStats?.shake_total_tickets || 0}</p>
              </div>
           </div>
        </div>

        {/* Progress bar */}
        <div className={`h-1 w-full rounded-full bg-white/10 overflow-hidden mb-4 transition-opacity duration-700 relative z-10 ${progressFill ? "opacity-0" : "opacity-100"}`}>
          <div className={`h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-500 ${progressFill ? "w-full" : "w-0"}`} />
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleOpenShake}
          disabled={!shakeRightAvailable}
          className={`
            relative z-10 w-full py-3.5 rounded-2xl font-display font-bold text-sm tracking-wide transition-all duration-300 ease-out
            ${shakeRightAvailable 
               ? "bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white shadow-[0_0_24px_rgba(236,72,153,0.55),0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_36px_rgba(236,72,153,0.75),0_4px_16px_rgba(0,0,0,0.5)] hover:scale-[1.02] active:scale-[0.97]" 
               : "bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed"}
          `}
        >
          {shakeLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing
            </span>
          ) : shakeRightAvailable ? (
            <span className="animate-pulse">Shake Now ✨</span>
          ) : (
            "Locked"
          )}
        </button>
      </div>

      {shakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-lg px-4">
          <div className="w-full max-w-sm rounded-[2rem] p-7 text-center bg-zinc-900/90 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(168,85,247,0.3)] animate-shake-mount">
            {shakeWonTickets != null ? (
              <>
                <div className="flex justify-center mb-5 mt-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#4ade80]/20 to-transparent blur-2xl rounded-full scale-150 pointer-events-none" />
                  <div className="w-24 h-24 rounded-full bg-[#4ade80]/15 border-[3px] border-[#4ade80]/40 flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.5)] relative z-10" style={{ animation: "pulse-glow 2s infinite" }}>
                    <Ticket size={48} className="text-[#4ade80] drop-shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                  </div>
                </div>
                <h3 className="font-display font-black text-white text-3xl mb-1 tracking-tight">You won {shakeWonTickets} tickets!</h3>
                <p className="text-sm font-medium text-white/50 mb-8 border border-white/10 bg-white/5 inline-flex px-3 py-1 rounded-full">Awesome catch! Added to your balance.</p>
                
                <button
                  onClick={() => { setShakeModalOpen(false); setShakeWonTickets(null); setShakeLoading(false); setProgressFill(false); }}
                  className="w-full py-4 rounded-2xl font-display font-bold text-sm text-[#001a09] bg-gradient-to-r from-green-400 to-[#4ade80] shadow-[0_0_24px_rgba(74,222,128,0.6)] hover:opacity-90 active:scale-[0.97] transition-all hover:shadow-[0_0_40px_rgba(74,222,128,0.8)] tracking-wide"
                >
                  Awesome 🎉
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-5 relative">
                   <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent blur-xl rounded-full scale-150 pointer-events-none" />
                   <div className="w-24 h-24 rounded-[1.5rem] flex items-center justify-center bg-white/5 border-2 border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.4)] relative z-10" style={shakeLoading ? { animation: "card-shake 0.4s ease-in-out infinite" } : { animation: "breathing-glow 3s ease-in-out infinite" }}>
                      <Smartphone size={46} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                   </div>
                </div>
                <h3 className="font-display font-bold text-white text-2xl mb-2 tracking-tight">Give it a shake!</h3>
                <p className="text-sm text-white/60 mb-6">Hold tight and shake your device to generate random daily tickets.</p>
                {shakeLoading ? (
                  <p className="text-purple-400 text-sm font-bold mb-6 animate-pulse">Detecting shake force...</p>
                ) : (
                  <button
                    onClick={handleShake}
                    className="w-full py-3.5 mb-3 rounded-2xl font-display font-bold text-sm text-white bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:bg-white/10 transition-colors"
                  >
                    Or Tap to Shake Manually
                  </button>
                )}
                <button
                  onClick={() => { setShakeModalOpen(false); setShakeLoading(false); }}
                  disabled={shakeLoading}
                  className="text-zinc-500 text-sm font-medium hover:text-white transition-colors disabled:opacity-30 underline decoration-zinc-800 underline-offset-4"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
