import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Receipt, MapPin, Coins, Trophy, Flame, Award } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useUserDealsCount } from "@/hooks/useUserDealsCount";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import BottomNav from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";

const WEEKLY_MAX = 42;
const DAILY_RECEIPT_LIMIT = 3;
const DAILY_PROMO_LIMIT = 3;

function getTitle(tickets: number): string {
  if (tickets >= 30) return "Efsane Avcı 🔥";
  if (tickets >= 15) return "Gümüş Avcı";
  return "Bronz Avcı";
}

function formatDisplayName(nickname: string | null | undefined, userId: string): string {
  if (nickname?.trim()) return nickname.trim();
  const shortId = userId?.slice(-6) ?? "000000";
  return `CuanHunter_#${shortId.toUpperCase()}`;
}

const MOCK_WINNERS = [
  { id: 1, winner_user_id: "mock1", nickname: "CuanHunter_#A1B2C3", reward_amount: 100000 },
  { id: 2, winner_user_id: "mock2", nickname: "CuanHunter_#D4E5F6", reward_amount: 100000 },
  { id: 3, winner_user_id: "mock3", nickname: "Siti_Receipt", reward_amount: 100000 },
  { id: 4, winner_user_id: "mock4", nickname: "CuanHunter_#789ABC", reward_amount: 100000 },
  { id: 5, winner_user_id: "mock5", nickname: "Budi_Promo", reward_amount: 100000 },
];

export default function CuanDashboard() {
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading: authLoading } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { data: dealsCount = 0 } = useUserDealsCount(user?.id);
  const { data: lotteryWinners = [] } = useLotteryWinners(5);

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

  if (!isOnboarded && !authLoading) return null;

  const totalReceipts = stats?.total_receipts ?? 0;
  const cuan = stats?.cuan ?? 0;
  const displayName = formatDisplayName(user?.nickname ?? stats?.nickname, user?.id ?? "");
  const title = getTitle(weeklyTickets);
  const progressPercent = Math.min(100, (weeklyTickets / WEEKLY_MAX) * 100);

  const winners = lotteryWinners.length >= 5 ? lotteryWinners.slice(0, 5) : MOCK_WINNERS;

  return (
    <div className="min-h-screen max-w-[420px] mx-auto pb-28 relative">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff6ec4] via-[#c94fd6] to-[#8e2de2]" />
      <PageHeader title="Cuan Dashboard" onBack={() => navigate(-1)} />

      {/* Bilet Kavanozu - Haftalık İlerleme */}
      <div className="mx-4 mt-4 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/20 to-primary/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ticket size={20} className="text-amber-500" />
            <span className="font-display font-bold text-foreground">Haftalık Bilet Kavanozu</span>
          </div>
          <span className="text-sm font-bold text-amber-600">
            {weeklyTickets}/{WEEKLY_MAX}
          </span>
        </div>
        <Progress value={progressPercent} className="h-4 bg-amber-500/20" />
        <p className="mt-2 text-[10px] text-muted-foreground">
          Günlük: {DAILY_RECEIPT_LIMIT} Fiş + {DAILY_PROMO_LIMIT} İndirim = 6 Bilet
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2">
          <Flame size={16} className="text-red-500" />
          <span className="font-display font-bold text-amber-700">{title}</span>
        </div>
      </div>

      {/* Kişisel İstatistikler */}
      <div className="mx-4 mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Kişisel İstatistikler
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <span className="font-display text-xl font-bold text-primary">
                {displayName[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className="font-display font-bold text-foreground">{displayName}</p>
              <p className="text-[10px] text-muted-foreground">Level {stats?.level ?? 1}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="p-4 text-center">
              <Receipt size={20} className="mx-auto mb-1 text-green-500" />
              <p className="font-display text-lg font-bold text-foreground">{totalReceipts}</p>
              <p className="text-[10px] text-muted-foreground">Taranan Fiş</p>
            </div>
            <div className="p-4 text-center">
              <MapPin size={20} className="mx-auto mb-1 text-red-500" />
              <p className="font-display text-lg font-bold text-foreground">{dealsCount}</p>
              <p className="text-[10px] text-muted-foreground">Paylaşılan İndirim</p>
            </div>
            <div className="p-4 text-center">
              <Coins size={20} className="mx-auto mb-1 text-amber-500" />
              <p className="font-display text-lg font-bold text-foreground">
                Rp {cuan.toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-muted-foreground">Toplam Ödül</p>
            </div>
          </div>
        </div>
      </div>

      {/* Geçen Haftanın Şanslıları - Hall of Fame */}
      <div className="mx-4 mt-6">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          <Trophy size={14} className="text-amber-500" />
          Geçen Haftanın Şanslıları
        </h2>
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent overflow-hidden">
          <div className="p-3 border-b border-amber-500/20 bg-amber-500/10">
            <p className="text-[10px] text-muted-foreground text-center">
              100.000 IDR kazanan şanslı avcılar
            </p>
          </div>
          <ul className="divide-y divide-border">
            {winners.map((w, i) => {
              const winner = w as { id?: number; winner_user_id?: string; nickname?: string; reward_amount?: number };
              const name = formatDisplayName(winner.nickname, winner.winner_user_id ?? String(winner.id ?? i));
              const reward = winner.reward_amount ?? 100000;
              return (
                <li key={winner.id ?? i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/30 font-bold text-amber-700 text-xs">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Rp {reward.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Award size={16} className="text-amber-500 shrink-0" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
