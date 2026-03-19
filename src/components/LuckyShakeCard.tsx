import { useState, useCallback, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { Smartphone, Ticket } from "lucide-react";
import { toast } from "sonner";
import { shakeToWin } from "@/hooks/useShakeToWin";
import { useShakeDetection, requestShakePermission, isShakeSupported } from "@/hooks/useShakeDetection";
import { useQueryClient } from "@tanstack/react-query";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { pad } from "@/lib/weeklyCountdown";

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
  const queryClient = useQueryClient();
  const [shakeLoading, setShakeLoading] = useState(false);
  const [shakeModalOpen, setShakeModalOpen] = useState(false);
  const [shakeWonTickets, setShakeWonTickets] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [progressFill, setProgressFill] = useState(false);

  // Step 3 — one shake right per week, unlocked only when countdown hits zero
  const [shakeRightAvailable, setShakeRightAvailable] = useState(false);
  const hadNonZeroRef = useRef(false);

  const isCountdownZero =
    (countdown?.days ?? 0) === 0 &&
    (countdown?.hours ?? 0) === 0 &&
    (countdown?.minutes ?? 0) === 0 &&
    (countdown?.seconds ?? 0) === 0;

  // Track when countdown transitions to zero for the first time in this session
  useEffect(() => {
    if (!countdownReady) return;
    if (!isCountdownZero) {
      hadNonZeroRef.current = true;
    }
    // Unlock shake right when:
    // - countdown reaches zero after having been non-zero (natural weekly unlock), OR
    // - page loaded while countdown was already zero (user opened mid-draw window)
    if (isCountdownZero) {
      setShakeRightAvailable(true);
    }
  }, [countdownReady, isCountdownZero]);

  // Step 2 — animation fix: use inline style to override Tailwind animation atomically
  const triggerShakeAnimation = () => {
    setIsShaking(true);
    setProgressFill(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleShake = useCallback(async () => {
    if (shakeLoading || !userId) return;
    if (!shakeRightAvailable) {
      toast.error("Come back when the countdown reaches zero!");
      return;
    }
    setShakeLoading(true);
    setShakeWonTickets(null);
    triggerShakeAnimation();
    try {
      const result = await shakeToWin();
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["user_stats"] });
        setShakeLoading(false);
        setShakeWonTickets(result.ticketsAdded ?? 1);
        // Consume the weekly shake right
        setShakeRightAvailable(false);
      } else {
        const errMsg = result?.error ?? "Gagal";
        if (errMsg === "SHAKE_ALREADY_USED") {
          toast.error("Already used this period. Come back next week!");
          setShakeRightAvailable(false);
        } else if (errMsg === "WEEKLY_LIMIT_REACHED") {
          toast.error("Weekly ticket limit reached.");
        } else {
          toast.error(errMsg);
        }
        setShakeLoading(false);
      }
    } catch (err) {
      console.error("[LuckyShake] error:", err);
      toast.error("Gagal");
      setShakeLoading(false);
    }
  }, [shakeLoading, userId, queryClient, shakeRightAvailable]);

  useShakeDetection({
    onShake: handleShake,
    enabled: shakeModalOpen && shakeWonTickets == null,
  });

  const handleOpenShake = async () => {
    try {
      if (!userId) { toast.error("Login to play"); return; }
      if (isWeeklyLimitReached) { toast.error("Weekly ticket limit reached."); return; }
      if (!shakeRightAvailable) {
        toast.error("Your shake unlocks when the countdown hits zero!");
        return;
      }
      if (!isShakeSupported()) { toast.error("Device not supported. Try on mobile."); return; }
      const granted = await requestShakePermission();
      if (!granted) { toast.error("Sensor permission required for Lucky Shake."); return; }
      setShakeWonTickets(null);
      setProgressFill(false);
      setShakeModalOpen(true);
    } catch (err) {
      console.error("[LuckyShake] open error:", err);
      toast.error("Gagal");
    }
  };

  // Icon cycling: smartphone ↔ golden ticket every 4 s
  const [isTicketPreview, setIsTicketPreview] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setIsTicketPreview((p) => !p), 4000);
    return () => clearInterval(id);
  }, []);

  const countdownBlocks = [
    { val: pad(countdown?.days ?? 0), label: "DD" },
    { val: pad(countdown?.hours ?? 0), label: "HH" },
    { val: pad(countdown?.minutes ?? 0), label: "MM" },
    { val: pad(countdown?.seconds ?? 0), label: "SS" },
  ];

  // Card shake via inline style to avoid Tailwind animation class conflict
  const cardAnimStyle: CSSProperties = isShaking
    ? { animation: "card-shake 0.55s ease-in-out forwards" }
    : {};

  return (
    <>
      {/* ──────────── Lucky Shake Card ──────────── */}
      <div
        className="
          relative overflow-hidden rounded-3xl p-5
          bg-zinc-900/60 backdrop-blur-3xl
          border border-white/10
          shadow-2xl
          transition-all duration-300 ease-out
          hover:scale-[1.02]
          animate-shake-mount
        "
        style={cardAnimStyle}
      >
        {/* Subtle ambient overlay — purple only, no pink */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-700/8 via-transparent to-indigo-900/8" />

        {/* Header row */}
        <div className="flex items-start gap-3 mb-4 relative z-10">

          {/* ── Premium layered icon container ── */}
          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-breathing-glow"
            style={{ background: "#0a0a0c", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            {/* Plasma nebula inner glow rings */}
            <div className="absolute inset-0 rounded-2xl opacity-60"
              style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(168,85,247,0.35) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 rounded-2xl opacity-40"
              style={{ background: "radial-gradient(ellipse at 70% 70%, rgba(236,72,153,0.3) 0%, transparent 65%)" }} />

            {/* Layer 1 — Wireframe Smartphone (shown when !isTicketPreview) */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
              style={{ opacity: isTicketPreview ? 0 : 1 }}
            >
              <svg
                viewBox="0 0 36 60"
                width="26"
                height="26"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.7))" }}
              >
                {/* Phone body */}
                <rect x="3" y="1" width="30" height="58" rx="5" />
                {/* Speaker notch */}
                <line x1="13" y1="6" x2="23" y2="6" strokeWidth="2" />
                {/* Screen */}
                <rect x="6" y="10" width="24" height="38" rx="1.5" strokeWidth="1" stroke="rgba(255,255,255,0.5)" />
                {/* Home button */}
                <circle cx="18" cy="54" r="2.5" />
              </svg>
            </div>

            {/* Layer 2 — Golden Ticket wireframe (shown when isTicketPreview) */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
              style={{
                opacity: isTicketPreview ? 1 : 0,
                animation: isTicketPreview ? "ticket-breathe 3s ease-in-out infinite" : "none",
              }}
            >
              <svg
                viewBox="0 0 80 46"
                width="44"
                height="44"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.9)) drop-shadow(0 0 12px rgba(236,72,153,0.6))" }}
              >
                {/* Outer ticket body */}
                <rect x="2" y="3" width="76" height="40" rx="3" stroke="rgba(216,180,254,0.9)" strokeWidth="1.2" />
                {/* Corner accent braces — top-left */}
                <path d="M2 12 Q2 3 11 3" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                {/* Corner accent braces — top-right */}
                <path d="M78 12 Q78 3 69 3" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                {/* Corner accent braces — bottom-left */}
                <path d="M2 34 Q2 43 11 43" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                {/* Corner accent braces — bottom-right */}
                <path d="M78 34 Q78 43 69 43" stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" />
                {/* Semi-circular notch left */}
                <path d="M2 19 Q-4 23 2 27" stroke="rgba(216,180,254,0.9)" strokeWidth="1.2" fill="none" />
                {/* Semi-circular notch right */}
                <path d="M78 19 Q84 23 78 27" stroke="rgba(216,180,254,0.9)" strokeWidth="1.2" fill="none" />
                {/* Perforation line */}
                <line x1="26" y1="3" x2="26" y2="43" stroke="rgba(168,85,247,0.6)" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
                {/* Small ticket stub lines */}
                <line x1="6" y1="15" x2="22" y2="15" stroke="rgba(216,180,254,0.5)" strokeWidth="0.8" />
                <line x1="6" y1="23" x2="22" y2="23" stroke="rgba(216,180,254,0.5)" strokeWidth="0.8" />
                <line x1="6" y1="31" x2="22" y2="31" stroke="rgba(216,180,254,0.5)" strokeWidth="0.8" />
                {/* T letter — horizontal bar */}
                <line x1="38" y1="14" x2="72" y2="14" stroke="rgba(255,255,255,0.95)" strokeWidth="2.2" />
                {/* T letter — vertical stem */}
                <line x1="55" y1="14" x2="55" y2="36" stroke="rgba(255,255,255,0.95)" strokeWidth="2.2" />
                {/* Inner decorative diamond at T intersection */}
                <polygon points="55,11 58,14 55,17 52,14" fill="none" stroke="rgba(236,72,153,0.85)" strokeWidth="0.8" />
                {/* Small ornamental dots at T tips */}
                <circle cx="38" cy="14" r="1.2" fill="rgba(168,85,247,0.9)" />
                <circle cx="72" cy="14" r="1.2" fill="rgba(168,85,247,0.9)" />
                <circle cx="55" cy="36" r="1.2" fill="rgba(168,85,247,0.9)" />
              </svg>
            </div>

            {/* Tiny indicator dot showing which icon is active */}
            <div className="absolute bottom-1 right-1 flex gap-0.5">
              <div className={`w-1 h-1 rounded-full transition-all duration-500 ${!isTicketPreview ? "bg-white/80" : "bg-white/25"}`} />
              <div className={`w-1 h-1 rounded-full transition-all duration-500 ${isTicketPreview ? "bg-[#a855f7]" : "bg-white/25"}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-base leading-tight tracking-tight">
              Lucky Shake
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Shake your phone to win bonus tickets!
            </p>
            <p className="text-xs font-semibold mt-1 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]">
              Win 1 to 5 tickets instantly
            </p>
          </div>
        </div>

        {/* Shake availability indicator */}
        <div className="mb-3 relative z-10">
          {shakeRightAvailable ? (
            <p className="text-xs font-bold text-[#4ade80] drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]">
              🎯 Your shake is ready — good luck!
            </p>
          ) : (
            <p className="text-[10px] text-white/60 uppercase tracking-widest">
              Next shake unlocks when countdown hits zero
            </p>
          )}
        </div>

        {/* Countdown boxes */}
        <div className="mb-4 relative z-10">
          <div className="flex gap-2">
            {countdownBlocks.map((block) => (
              <div
                key={block.label}
                className="flex-1 flex flex-col items-center rounded-xl bg-black/40 border border-white/10 py-2 px-1 min-w-0 animate-pulse-border"
              >
                <span className="font-display text-base font-bold text-white tabular-nums leading-none">
                  {block.val}
                </span>
                <span className="text-[9px] font-light text-white/40 uppercase tracking-widest mt-1">
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar — fills on shake then fades */}
        <div
          className={`h-1 w-full rounded-full bg-white/10 overflow-hidden mb-4 transition-opacity duration-700 relative z-10 ${
            progressFill ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-500 ${
              progressFill ? "w-full" : "w-0"
            }`}
          />
        </div>

        {/* Shake button — glow only on the button itself */}
        <button
          type="button"
          onClick={handleOpenShake}
          disabled={isWeeklyLimitReached || !shakeRightAvailable}
          className="
            relative z-10 w-full py-3.5 rounded-2xl
            font-display font-bold text-sm text-white tracking-wide
            bg-gradient-to-r from-[#ec4899] via-[#c026d3] to-[#7c3aed]
            shadow-[0_0_24px_rgba(236,72,153,0.55),0_4px_12px_rgba(0,0,0,0.4)]
            hover:shadow-[0_0_36px_rgba(236,72,153,0.75),0_4px_16px_rgba(0,0,0,0.5)]
            hover:scale-[1.02]
            active:scale-[0.97]
            disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
            transition-all duration-200 ease-out
          "
        >
          {shakeLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : shakeRightAvailable ? (
            "Shake Now"
          ) : (
            "Locked — Wait for Draw"
          )}
        </button>
      </div>

      {/* ──────────── Lucky Shake modal ──────────── */}
      {shakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-lg">
          <div className="mx-4 max-w-sm w-full rounded-3xl p-7 text-center bg-zinc-900/70 backdrop-blur-3xl border border-white/10 shadow-[0_0_60px_rgba(168,85,247,0.25)] animate-shake-mount">
            {shakeWonTickets != null ? (
              /* ── Win screen ── */
              <>
                <div className="flex justify-center mb-5">
                  <div className="w-20 h-20 rounded-full bg-[#4ade80]/15 border-2 border-[#4ade80]/50 flex items-center justify-center animate-glow-pop">
                    <Ticket
                      size={40}
                      className="text-[#4ade80] drop-shadow-[0_0_12px_rgba(74,222,128,0.9)]"
                    />
                  </div>
                </div>
                <h3 className="font-display font-bold text-white text-2xl mb-1 drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]">
                  You won {shakeWonTickets} Ticket{shakeWonTickets !== 1 ? "s" : ""}!
                </h3>
                <p className="text-sm text-white/60 mb-6">Congratulations! 🎉</p>
                <button
                  type="button"
                  onClick={() => {
                    setShakeModalOpen(false);
                    setShakeWonTickets(null);
                    setShakeLoading(false);
                    setProgressFill(false);
                  }}
                  className="w-full py-3.5 rounded-2xl font-display font-bold text-sm text-[#001a09] bg-[#4ade80] shadow-[0_0_24px_rgba(74,222,128,0.6)] hover:bg-[#4ade80]/90 active:scale-[0.97] transition-all"
                >
                  Done
                </button>
              </>
            ) : (
              /* ── Waiting for shake ── */
              <>
                <div className="flex justify-center mb-5">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white/5 border border-white/15 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    style={
                      shakeLoading
                        ? { animation: "card-shake 0.55s ease-in-out infinite" }
                        : { animation: "breathing 3s ease-in-out infinite" }
                    }
                  >
                    <Smartphone
                      size={40}
                      className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
                <h3 className="font-display font-bold text-white text-xl mb-2">
                  Lucky Shake!
                </h3>
                <p className="text-sm text-white/60 mb-2">
                  Shake your phone. Get 1–5 tickets!
                </p>
                {shakeLoading ? (
                  <p className="text-[#4ade80] text-sm font-bold mb-5">Processing...</p>
                ) : (
                  <p className="text-xs text-white/40 mb-5">Or tap the button below</p>
                )}
                <div className="flex flex-col gap-2">
                  {!shakeLoading && (
                    <button
                      type="button"
                      onClick={handleShake}
                      className="w-full py-3 rounded-2xl font-display font-bold text-sm text-white bg-gradient-to-r from-[#ec4899] to-[#7c3aed] shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all"
                    >
                      Tap to Shake
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShakeModalOpen(false);
                      setShakeLoading(false);
                    }}
                    disabled={shakeLoading}
                    className="text-white/40 text-sm font-medium hover:text-white/70 transition-colors py-1 disabled:opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
