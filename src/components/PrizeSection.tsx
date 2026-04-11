import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Award } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import { useTotalTicketsThisWeek } from "@/hooks/useWeeklyDraw";

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

const PrizeSection = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: ticketCount = 0 } = useUserTickets(user?.id);
  const { data: winners = [] } = useLotteryWinners(5);
  const { data: totalTicketsThisWeek = 0 } = useTotalTicketsThisWeek();
  const [showWinners, setShowWinners] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const progressTarget = 40;
  const progressPercent = Math.min(100, (ticketCount / progressTarget) * 100);

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
              <h3 className="font-display text-base font-bold text-foreground">
                {t("weeklyReward.winners.title")}
              </h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              {t("weeklyReward.winners.prizeLabel")}
            </p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {winners.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("weeklyReward.winners.empty")}</p>
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
                        <p className="text-xs font-semibold text-foreground">{w.winner_name ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(w.draw_date)}</p>
                      </div>
                    </div>
                    <span className="font-display text-[11px] font-bold text-primary">
                      {t("weeklyReward.amount")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="relative mx-4 rounded-2xl overflow-hidden p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_15px_50px_rgba(255,200,50,0.4)]"
        style={{
          background: "linear-gradient(135deg, #FFD86B, #F6B73C, #E89A24)",
          boxShadow: "0 10px 40px rgba(255,200,50,0.35)",
        }}
      >
        {/* Noise overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎁</span>
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-900/90">
              {t("weeklyReward.cardTitle")}
            </span>
          </div>

          {/* Main title */}
          <h2 className="font-display text-2xl font-bold text-amber-950">
            {t("weeklyReward.headline")}
          </h2>

          {/* Subtext */}
          <p className="text-sm text-amber-900/80 mt-0.5">
            {t("weeklyReward.subhead")}
          </p>

          {/* Instruction box */}
          <div
            className="mt-4 rounded-xl px-4 py-3 border border-amber-900/20"
            style={{
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <p className="text-xs text-amber-50 leading-relaxed">
              Upload struk belanja untuk mendapatkan tiket undian.
              <br />
              1 struk = 1 tiket.
              <br />
              Semakin banyak struk, semakin besar peluang menang.
            </p>
          </div>

          {/* User ticket info */}
          <p className="mt-4 text-sm font-bold text-amber-950">
            Kesempatan hadiah Anda: {ticketCount.toLocaleString()} tiket
          </p>

          {/* Progress bar */}
          <div className="mt-2">
            <p className="text-[10px] text-amber-900/80 mb-1">Progress ke batas tiket mingguan</p>
            <div className="h-2.5 rounded-full bg-amber-900/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-amber-900/80 mt-1">
              {Math.min(ticketCount, progressTarget)} / {progressTarget} tiket
            </p>
          </div>

          {/* FOMO social proof */}
          <p className="text-xs text-amber-900/90 mt-2">
            🔥 {totalTicketsThisWeek.toLocaleString()} tiket minggu ini
          </p>

          {/* Countdown */}
          <p className="text-[10px] text-amber-900/80 mt-4 text-center font-medium">
            Pengumuman pemenang dalam
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            {[
              { val: pad(timeLeft.days), label: "Days" },
              { val: pad(timeLeft.hours), label: "Hours" },
              { val: pad(timeLeft.minutes), label: "Min" },
              { val: pad(timeLeft.seconds), label: "Sec" },
            ].map((block, i) => (
              <div key={block.label} className="flex flex-col items-center">
                <div
                  className="rounded-lg px-3 py-2 font-display text-lg font-bold text-emerald-950 tabular-nums font-mono"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    boxShadow: "0 0 15px rgba(0,255,150,0.5)",
                    border: "1px solid rgba(46,229,157,0.4)",
                  }}
                >
                  {block.val}
                </div>
                <span className="mt-1 text-[9px] uppercase tracking-wider text-amber-900/80">
                  {block.label}
                </span>
              </div>
            ))}
          </div>

          {/* Action button */}
          <button
            onClick={() => setShowWinners(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold text-base text-white transition-all duration-200 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #2EE59D, #14C38E)",
              boxShadow: "0 4px 20px rgba(46,229,157,0.4)",
            }}
          >
            <Award size={18} />
            {t("weeklyReward.viewWinners")}
          </button>

          {/* Footer */}
          <p className="text-[9px] text-amber-900/70 mt-4 text-center leading-relaxed">
            Program ini adalah program promosi StrukCuan.
            <br />
            Pemenang menerima voucher setelah verifikasi struk.
          </p>
        </div>
      </div>
    </>
  );
};

export default PrizeSection;
