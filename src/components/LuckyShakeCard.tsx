import { useState, useCallback } from "react";
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
  userId: string | undefined;
  isWeeklyLimitReached: boolean;
}

export default function LuckyShakeCard({ countdown, userId, isWeeklyLimitReached }: LuckyShakeCardProps) {
  const queryClient = useQueryClient();
  const [shakeLoading, setShakeLoading] = useState(false);
  const [shakeModalOpen, setShakeModalOpen] = useState(false);
  const [shakeWonTickets, setShakeWonTickets] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [progressFill, setProgressFill] = useState(false);

  const isCountdownZero =
    (countdown?.days ?? 0) === 0 &&
    (countdown?.hours ?? 0) === 0 &&
    (countdown?.minutes ?? 0) === 0 &&
    (countdown?.seconds ?? 0) === 0;

  const triggerShakeAnimation = () => {
    setIsShaking(true);
    setProgressFill(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleShake = useCallback(async () => {
    if (shakeLoading || !userId) return;
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
      } else {
        const errMsg = result?.error ?? "Gagal";
        if (errMsg === "SHAKE_ALREADY_USED") {
          toast.error("Already used today. Come back tomorrow!");
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
  }, [shakeLoading, userId, queryClient]);

  useShakeDetection({
    onShake: handleShake,
    enabled: shakeModalOpen && shakeWonTickets == null,
  });

  const handleOpenShake = async () => {
    try {
      if (!userId) { toast.error("Login to play"); return; }
      if (isWeeklyLimitReached) { toast.error("Weekly limit reached."); return; }
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

  const countdownBlocks = [
    { val: pad(countdown?.days ?? 0), label: "DD" },
    { val: pad(countdown?.hours ?? 0), label: "HH" },
    { val: pad(countdown?.minutes ?? 0), label: "MM" },
    { val: pad(countdown?.seconds ?? 0), label: "SS" },
  ];

  return (
    <>
      {/* Lucky Shake Card */}
      <div
        className={`
          relative overflow-hidden rounded-3xl p-5
          bg-white/10 backdrop-blur-xl
          border border-white/20
          shadow-[0_8px_32px_rgba(236,72,153,0.35)]
          transition-all duration-300 ease-out
          hover:scale-[1.02] hover:shadow-[0_12px_48px_rgba(236,72,153,0.5)]
          animate-shake-mount
          ${isShaking ? "animate-card-shake" : ""}
        `}
      >
        {/* ambient glow layer */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/10 via-transparent to-purple-600/10" />

        {/* Header row */}
        <div className="flex items-start gap-3 mb-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 border border-white/20 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
            <Smartphone
              size={24}
              className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-base leading-tight tracking-tight">
              Lucky Shake
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              Shake your phone to win bonus tickets!
            </p>
            <p className="text-xs font-semibold mt-1 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]">
              Win 1 to 5 tickets instantly
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className="mb-4 relative z-10">
          <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1.5">
            Next draw in
          </p>
          <div className="flex gap-2">
            {countdownBlocks.map((block) => (
              <div
                key={block.label}
                className="flex-1 flex flex-col items-center rounded-xl bg-black/30 border border-white/10 py-2 px-1 min-w-0 animate-pulse-border"
              >
                <span className="font-display text-base font-bold text-white tabular-nums leading-none">
                  {block.val}
                </span>
                <span className="text-[9px] font-light text-white/50 uppercase tracking-widest mt-1">
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar (fills on shake, then fades) */}
        <div className={`h-1 w-full rounded-full bg-white/10 overflow-hidden mb-4 transition-opacity duration-700 ${progressFill ? "opacity-0" : "opacity-100"} relative z-10`}>
          <div
            className={`h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-500 ${progressFill ? "w-full" : "w-0"}`}
          />
        </div>

        {/* Shake button */}
        <button
          type="button"
          onClick={handleOpenShake}
          disabled={isWeeklyLimitReached || isCountdownZero}
          className="
            relative z-10 w-full py-3.5 rounded-2xl
            font-display font-bold text-sm text-white tracking-wide
            bg-gradient-to-r from-[#ec4899] via-[#c026d3] to-[#7c3aed]
            shadow-[0_0_24px_rgba(236,72,153,0.5),0_4px_12px_rgba(0,0,0,0.3)]
            hover:shadow-[0_0_36px_rgba(236,72,153,0.7),0_4px_16px_rgba(0,0,0,0.4)]
            hover:scale-[1.02]
            active:scale-[0.97]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
            transition-all duration-200 ease-out
          "
        >
          {shakeLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            "Shake"
          )}
        </button>
      </div>

      {/* Lucky Shake modal */}
      {shakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="mx-4 max-w-sm w-full rounded-3xl p-7 text-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_60px_rgba(236,72,153,0.3)] animate-shake-mount">
            {shakeWonTickets != null ? (
              /* Win screen */
              <>
                <div className="flex justify-center mb-5">
                  <div className="w-20 h-20 rounded-full bg-[#4ade80]/15 border-2 border-[#4ade80]/50 flex items-center justify-center animate-glow-pop">
                    <Ticket size={40} className="text-[#4ade80] drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                  </div>
                </div>
                <h3 className="font-display font-bold text-white text-2xl mb-1 drop-shadow-[0_0_16px_rgba(255,255,255,0.4)]">
                  You won {shakeWonTickets} Ticket{shakeWonTickets !== 1 ? "s" : ""}!
                </h3>
                <p className="text-sm text-white/70 mb-6">Congratulations! 🎉</p>
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
              /* Waiting for shake */
              <>
                <div className="flex justify-center mb-5">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(236,72,153,0.3)] ${shakeLoading ? "animate-card-shake" : "animate-breathing"}`}>
                    <Smartphone size={40} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-display font-bold text-white text-xl mb-2">Lucky Shake!</h3>
                <p className="text-sm text-white/70 mb-2">
                  Shake your phone. Get 1–5 tickets!
                </p>
                {shakeLoading ? (
                  <p className="text-[#4ade80] text-sm font-bold mb-5">Processing...</p>
                ) : (
                  <p className="text-xs text-white/50 mb-5">Or tap the button below</p>
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
                    className="text-white/50 text-sm font-medium hover:text-white/80 transition-colors py-1 disabled:opacity-40"
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
