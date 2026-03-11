import { useState, useEffect } from "react";
import { Trophy, X, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";

const lastWeekWinners = [
  { id: "#SX92", nickname: "HunterBudi" },
  { id: "#KL47", nickname: "SitiCuan" },
  { id: "#MR13", nickname: "RinaStruk" },
  { id: "#AB28", nickname: "JokoReceipt" },
  { id: "#ZT55", nickname: "MayaPoin" },
];

const getNextSunday21 = () => {
  const now = new Date();
  const target = new Date(now);
  const day = target.getUTCDay();
  const daysUntil = day === 0 ? 0 : 7 - day;
  target.setUTCDate(target.getUTCDate() + daysUntil);
  target.setUTCHours(14, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 7);
  return target;
};

const PrizeSection = () => {
  const { user } = useUser();
  const { data: stats } = useUserStats(user?.phone);
  const progressValue = 68;
  const [showWinners, setShowWinners] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = getNextSunday21().getTime() - Date.now();
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
  const tiket = stats?.tiket ?? user?.tiket ?? 0;

  return (
    <>
      {/* Winner history overlay */}
      {showWinners && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 backdrop-blur-md animate-fade-in">
          <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-yellow-500/40 bg-card p-5 shadow-[0_0_50px_hsl(45_100%_50%/0.2)]">
            <button onClick={() => setShowWinners(false)} className="absolute top-3 right-3 text-muted-foreground">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} className="text-yellow-400" />
              <h3 className="font-display text-base font-bold text-foreground">Pemenang Minggu Lalu</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">Undian 08.03.2026 · Masing-masing menang 100.000 Rp</p>
            <div className="flex flex-col gap-2">
              {lastWeekWinners.map((w, i) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl border border-yellow-500/20 bg-secondary/30 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/15">
                      <span className="text-[10px] font-bold text-yellow-400">#{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{w.nickname}</p>
                      <p className="text-[10px] text-muted-foreground">ID: {w.id}</p>
                    </div>
                  </div>
                  <span className="font-display text-[11px] font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                    Menang 100.000 Rp
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-4 glow-green">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Undian Minggu Ini
          </span>
        </div>

        <p className="font-display text-3xl font-bold text-foreground glow-green-text tracking-tight">
          500.000 <span className="text-base text-muted-foreground">Rp</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          100.000 Rp × <span className="font-bold text-primary">5 Pemenang</span>
        </p>

        {/* Auto entry notice */}
        <div className="mt-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            📸 <span className="font-semibold text-foreground">Setiap foto struk otomatis menjadi 1 tiket undian</span>
          </p>
          <p className="text-[10px] text-primary mt-0.5 font-semibold">
            Tiket kamu: {tiket.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Compact countdown */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {[
            { val: pad(timeLeft.days), label: "Hari" },
            { val: pad(timeLeft.hours), label: "Jam" },
            { val: pad(timeLeft.minutes), label: "Min" },
            { val: pad(timeLeft.seconds), label: "Det" },
          ].map((block, i) => (
            <div key={block.label} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center">
                <div className="rounded-lg bg-secondary border border-primary/20 px-2.5 py-1 font-display text-lg font-bold text-primary glow-green-text tabular-nums" style={{ fontFamily: '"Space Grotesk", monospace' }}>
                  {block.val}
                </div>
                <span className="mt-0.5 text-[7px] uppercase tracking-wider text-muted-foreground">{block.label}</span>
              </div>
              {i < 3 && <span className="text-sm font-bold text-primary glow-green-text animate-pulse mt-[-10px]">:</span>}
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Progress ke Level 8</span>
            <span className="text-[10px] font-bold text-primary glow-green-text">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-1.5 bg-secondary" />
        </div>

        {/* Winner history button */}
        <button
          onClick={() => setShowWinners(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 py-2.5 font-display font-bold text-sm bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 bg-clip-text text-transparent shadow-[0_0_15px_hsl(45_100%_50%/0.1)]"
        >
          <Award size={14} className="text-yellow-400" />
          <span>Pemenang Minggu Lalu</span>
        </button>
      </div>
    </>
  );
};

export default PrizeSection;
