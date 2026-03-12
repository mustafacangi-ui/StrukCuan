import { useState, useEffect } from "react";
import { Trophy, X, Award, Ticket } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";

const getNextSunday = () => {
  const now = new Date();
  const target = new Date(now);
  const day = target.getDay();
  const daysUntil = day === 0 ? 7 : 7 - day;
  target.setDate(target.getDate() + daysUntil);
  target.setHours(23, 59, 59, 999);
  return target;
};

const PrizeSection = () => {
  const { user } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const { data: winners = [] } = useLotteryWinners(5);
  const [showWinners, setShowWinners] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = getNextSunday().getTime() - Date.now();
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
  const tickets = stats?.tiket ?? user?.tiket ?? 0;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      {showWinners && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 backdrop-blur-md animate-fade-in">
          <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-primary/40 bg-card p-5">
            <button onClick={() => setShowWinners(false)} className="absolute top-3 right-3 text-muted-foreground">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} className="text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">Lottery Winners</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Voucher Belanja 100.000 Rp
            </p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {winners.length === 0 ? (
                <p className="text-xs text-muted-foreground">No winners yet</p>
              ) : (
                winners.map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                        <span className="text-[10px] font-bold text-primary">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{w.nickname}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(w.draw_date)}</p>
                      </div>
                    </div>
                    <span className="font-display text-[11px] font-bold text-primary">
                      100.000 Rp
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="relative mx-4 rounded-xl border border-primary/30 p-4 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at top right, rgba(255,255,255,0.25), transparent 60%), linear-gradient(to top, #0B0B0B, #3A2A00, #C89B2C, #FFD85A)",
          boxShadow: "0 10px 30px rgba(255, 215, 90, 0.25)",
        }}
      >
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Ticket size={28} color="#FF2E63" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Weekly Lottery
          </span>
        </div>

        <p className="font-display text-2xl font-bold text-foreground mt-1">
          Menang Voucher Belanja
        </p>
        <p className="text-lg font-bold text-primary mt-0.5">
          100.000 Rp
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          5 winners every Sunday
        </p>

        <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">
            📸 Setiap struk = 1 tiket undian
          </p>
          <p className="text-sm font-bold text-primary mt-0.5">
            Your tickets: {tickets.toLocaleString()}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {[
            { val: pad(timeLeft.days), label: "Days" },
            { val: pad(timeLeft.hours), label: "Hrs" },
            { val: pad(timeLeft.minutes), label: "Min" },
            { val: pad(timeLeft.seconds), label: "Sec" },
          ].map((block, i) => (
            <div key={block.label} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center">
                <div className="rounded-lg bg-secondary border border-primary/20 px-2.5 py-1 font-display text-lg font-bold text-primary tabular-nums">
                  {block.val}
                </div>
                <span className="mt-0.5 text-[7px] uppercase tracking-wider text-muted-foreground">
                  {block.label}
                </span>
              </div>
              {i < 3 && <span className="text-sm font-bold text-primary mt-[-10px]">:</span>}
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowWinners(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-2.5 font-display font-bold text-sm text-primary"
        >
          <Award size={14} className="text-primary" />
          <span>View Winners</span>
        </button>
      </div>
    </>
  );
};

export default PrizeSection;
