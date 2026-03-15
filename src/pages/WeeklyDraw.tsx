import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Ticket, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { useTotalTicketsThisWeek, useLastWinner } from "@/hooks/useWeeklyDraw";

const PRIZE_POOL = 50;
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
      {/* Cosmic background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0612] via-[#1a0a2e] to-[#0d0518]" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-10 h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
          <div className="absolute top-40 right-20 h-1 w-1 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-40 left-1/4 h-1.5 w-1.5 rounded-full bg-fuchsia-300 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-60 right-1/3 h-1 w-1 rounded-full bg-pink-300 animate-pulse" style={{ animationDelay: "0.3s" }} />
          <div className="absolute top-1/3 left-1/2 h-2 w-2 rounded-full bg-amber-300/60 animate-pulse" style={{ animationDelay: "0.8s" }} />
        </div>
      </div>

      {/* Header */}
      <div className="relative mx-4 mt-4 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-5">
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
                ${PRIZE_POOL}
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

            {/* Total Tickets */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Tickets This Week</p>
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
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Ticket ID</p>
                      <p className="font-display font-bold text-amber-300">
                        {lastWinner.ticket_number ?? lastWinner.ticket_id ?? `#${lastWinner.id}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Prize</p>
                      <p className="font-display font-bold text-amber-300">
                        ${lastWinner.prize ?? PRIZE_POOL}
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
