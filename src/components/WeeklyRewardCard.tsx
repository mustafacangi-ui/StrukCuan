import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, X, Gift } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";

/** Get next Sunday 21:00 Jakarta (WIB). Jakarta = UTC+7, so 21:00 WIB = 14:00 UTC */
function getNextDrawTime(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  let daysToAdd = (7 - day) % 7;
  if (daysToAdd === 0 && (hour > 14 || (hour === 14 && minute >= 0))) {
    daysToAdd = 7;
  }

  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + daysToAdd);
  next.setUTCHours(14, 0, 0, 0);
  return next;
}

export default function WeeklyRewardCard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: ticketCount = 0 } = useUserTickets(user?.id);
  const { data: winners = [] } = useLotteryWinners(5);
  const [showWinners, setShowWinners] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const progressPercent = Math.min(100, (ticketCount / MAX_TICKETS_PER_WEEK) * 100);

  useEffect(() => {
    const tick = () => {
      const diff = getNextDrawTime().getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      {showWinners && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="relative mx-4 w-full max-w-sm card-radar rounded-2xl p-5">
            <button onClick={() => setShowWinners(false)} className="absolute top-3 right-3 text-white/60 hover:text-white">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} className="text-[#00FF88]" />
              <h3 className="font-display text-base font-bold text-white">Prize Winners</h3>
            </div>
            <p className="text-xs text-white/60 mb-4">Rp100,000 Shopping Voucher</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {winners.length === 0 ? (
                <p className="text-xs text-white/60">No winners yet</p>
              ) : (
                winners.map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00FF88]/20">
                        <span className="text-[10px] font-bold text-[#00FF88]">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{w.nickname}</p>
                        <p className="text-[10px] text-white/50">{formatDate(w.draw_date)}</p>
                      </div>
                    </div>
                    <span className="font-display text-[11px] font-bold text-[#00FF88]">Rp100,000</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 card-radar rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20">
            <Gift size={18} className="text-[#00FF88]" />
          </div>
          <h2 className="font-display text-sm font-bold text-white">Weekly Reward</h2>
        </div>

        <p className="font-display text-lg font-bold text-white">Win a Rp100,000 Shopping Voucher</p>
        <p className="text-xs text-white/60 mt-0.5">5 winners every week</p>

        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/50">Weekly Prize Pool</p>
          <p className="font-display text-sm font-bold text-[#00FF88]">5 × Rp100,000 vouchers</p>
        </div>

        <div className="mt-4">
          <p className="text-[10px] text-white/50 mb-1">Your Weekly Tickets</p>
          <p className="font-display text-sm font-bold text-white">
            {ticketCount} / {MAX_TICKETS_PER_WEEK} tickets
          </p>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[9px] text-white/40 mt-1">Max {MAX_TICKETS_PER_WEEK} tickets per week</p>
        </div>

        <div className="mt-4">
          <p className="text-[10px] text-white/50 mb-2">Next draw in</p>
          <div className="flex gap-2 items-stretch">
            {[
              { val: pad(timeLeft.days), label: "Days" },
              { val: pad(timeLeft.hours), label: "Hours" },
              { val: pad(timeLeft.minutes), label: "Min" },
              { val: pad(timeLeft.seconds), label: "Sec" },
            ].map((block) => (
              <div key={block.label} className="flex flex-1 flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 py-3 px-2 min-w-0">
                <span className="font-display text-base font-bold text-white tabular-nums leading-tight">{block.val}</span>
                <span className="text-[9px] text-white/50 uppercase mt-1">{block.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowWinners(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 py-3.5 min-h-[48px] font-display font-bold text-sm text-white transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        >
          <Award size={16} />
          View Winners
        </button>
        <button
          onClick={() => navigate("/earn")}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 py-2.5 font-display font-bold text-xs text-white transition-all hover:bg-white/20"
        >
          Earn More Tickets
        </button>
      </div>
    </>
  );
}
