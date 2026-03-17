import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Ticket, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import LegalFooter from "@/components/LegalFooter";
import { useTotalTicketsThisWeek, useLastWinner } from "@/hooks/useWeeklyDraw";

const PRIZE_POOL_TOTAL = 500_000;
const PRIZE_PER_WINNER = 100_000;
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

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

export default function WeeklyDraw() {
  const navigate = useNavigate();
  const nextDraw = getNextDrawTime();
  const { days, hours, minutes, seconds } = useCountdown(nextDraw);
  const { data: totalTickets, isLoading: ticketsLoading } = useTotalTicketsThisWeek();
  const { data: lastWinner, isLoading: winnerLoading } = useLastWinner();

  const cardBase =
    "relative overflow-hidden rounded-2xl border-2 border-pink-500/50 bg-black/40 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(236,72,153,0.15)]";

  const gradientBtn =
    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold text-sm bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:opacity-95 transition-opacity";

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff4ecd] via-[#9b5cff] to-[#1a0f3c] bg-fixed" />

      <PageHeader title="Weekly Draw" onBack={() => navigate(-1)} />

      {/* Header card */}
      <div className="relative mx-4 mt-4 overflow-hidden rounded-xl p-5" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
        <div className="relative z-10">
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Weekly Draw
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly lottery draw every Sunday at 21:00 WIB
          </p>
        </div>
      </div>

      <div className="mt-6 px-4">
        <div className={cardBase}>
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/5 via-transparent to-purple-600/5" />
          <div className="relative z-10 space-y-5">
            {/* Prize Pool */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prize Pool</p>
              <p className="text-2xl font-display font-bold text-primary">
                Rp {PRIZE_POOL_TOTAL.toLocaleString("id-ID")}
              </p>
            </div>

            {/* Next Draw */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Draw</p>
              <p className="text-lg font-display font-semibold text-white">
                Sunday 21:00 WIB
              </p>
            </div>

            {/* Countdown */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Countdown</p>
              <div className="flex gap-2">
                {[
                  { label: "Days", value: days },
                  { label: "Hours", value: hours },
                  { label: "Min", value: minutes },
                  { label: "Sec", value: seconds },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 rounded-lg bg-gradient-to-b from-pink-500/20 to-purple-600/20 border border-pink-500/30 px-2 py-3 text-center"
                  >
                    <p className="text-lg font-display font-bold text-primary tabular-nums">
                      {String(value).padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Tickets This Week */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">TOTAL TICKETS THIS WEEK</p>
              <p className="text-xl font-display font-bold text-white">
                {ticketsLoading ? "..." : totalTickets ?? 0}
              </p>
            </div>

            {/* Last Winner */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Last Winner</p>
              {winnerLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : lastWinner ? (
                <div className="rounded-lg bg-gradient-to-b from-amber-500/10 to-amber-600/10 border border-amber-400/30 p-4">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-display font-bold text-amber-300 truncate">
                        {lastWinner.user_id ?? "—"}
                      </p>
                      {lastWinner.draw_date && (
                        <p className="text-xs text-muted-foreground mt-1">Draw: {lastWinner.draw_date}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Prize</p>
                      <p className="font-display font-bold text-amber-300">
                        Rp {(lastWinner.prize_amount ?? lastWinner.prize ?? PRIZE_PER_WINNER).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No winner yet</p>
              )}
            </div>

            {/* Earn More Tickets */}
            <button
              type="button"
              onClick={() => navigate("/promo")}
              className={gradientBtn}
            >
              <Ticket size={18} />
              Earn More Tickets
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
