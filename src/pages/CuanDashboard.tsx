import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Ticket, Receipt, MapPin, Coins, Trophy, Flame, Award, Gift, ClipboardList } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { formatCurrency } from "@/config/locale";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useUserDealsCount } from "@/hooks/useUserDealsCount";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import BottomNav from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";
import { DAILY_RECEIPT_LIMIT } from "@/hooks/useUploadLimits";

const WEEKLY_MAX = 42;
const DAILY_PROMO_LIMIT = 3;

function getTitle(tickets: number, t: (key: string) => string): string {
  if (tickets >= 30) return t("cuanDashboard.titles.legend");
  if (tickets >= 15) return t("cuanDashboard.titles.silver");
  return t("cuanDashboard.titles.bronze");
}

function formatDisplayName(nickname: string | null | undefined, userId: string): string {
  if (nickname?.trim()) return nickname.trim();
  const shortId = userId?.slice(-6) ?? "000000";
  return `CuanHunter_#${shortId.toUpperCase()}`;
}


export default function CuanDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading: authLoading } = useUser();
  const countryCode = user?.countryCode ?? "ID";
  const { data: stats } = useUserStats(user?.id);
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { data: dealsCount = 0 } = useUserDealsCount(user?.id);
  const { data: lotteryWinners = [] } = useLotteryWinners(5, countryCode);

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/home", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

  if (!isOnboarded && !authLoading) return null;

  const totalReceipts = stats?.total_receipts ?? 0;
  const cuan = stats?.cuan ?? 0;
  const displayName = formatDisplayName(user?.nickname ?? stats?.nickname, user?.id ?? "");
  const title = getTitle(weeklyTickets, t);
  const progressPercent = Math.min(100, (weeklyTickets / WEEKLY_MAX) * 100);

  const winners = lotteryWinners.slice(0, 5);

  return (
    <div className="min-h-screen max-w-[420px] mx-auto pb-28 relative">
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />
      <PageHeader title={t("cuanDashboard.title")} onBack={() => navigate(-1)} />

      {/* Ödüller + Anket */}
      <div className="mx-4 mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigate("/rewards")}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-sm bg-amber-500/20 border border-amber-500/40 text-amber-700 hover:bg-amber-500/30 transition-colors"
        >
          <Gift size={18} />
          {t("cuanDashboard.rewards")}
        </button>
        <button
          type="button"
          onClick={() => navigate("/surveys")}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-sm bg-white/40 border border-white/50 text-emerald-700 hover:bg-white/50 transition-colors backdrop-blur-xl"
        >
          <ClipboardList size={18} />
          {t("cuanDashboard.surveys")}
        </button>
      </div>

      {/* Bilet Kavanozu - Haftalık İlerleme */}
      <div className="mx-4 mt-4 card-radar rounded-2xl p-5 border-amber-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ticket size={20} className="text-amber-500" />
            <span className="font-display font-bold text-foreground">{t("cuanDashboard.weeklyJar")}</span>
          </div>
          <span className="text-sm font-bold text-amber-600">
            {weeklyTickets}/{WEEKLY_MAX}
          </span>
        </div>
        <Progress value={progressPercent} className="h-4 bg-amber-500/20" />
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("cuanDashboard.dailyInfo", { receipts: DAILY_RECEIPT_LIMIT, deals: DAILY_PROMO_LIMIT, total: 6 })}
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2">
          <Flame size={16} className="text-red-500" />
          <span className="font-display font-bold text-amber-700">{title}</span>
        </div>
      </div>

      {/* Kişisel İstatistikler */}
      <div className="mx-4 mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t("cuanDashboard.stats")}
        </h2>
        <div className="card-radar rounded-2xl overflow-hidden">
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
              <p className="text-[10px] text-muted-foreground">{t("cuanDashboard.scannedReceipts")}</p>
            </div>
            <div className="p-4 text-center">
              <MapPin size={20} className="mx-auto mb-1 text-red-500" />
              <p className="font-display text-lg font-bold text-foreground">{dealsCount}</p>
              <p className="text-[10px] text-muted-foreground">{t("cuanDashboard.sharedDeals")}</p>
            </div>
            <div className="p-4 text-center">
              <Coins size={20} className="mx-auto mb-1 text-amber-500" />
              <p className="font-display text-lg font-bold text-foreground">
                {formatCurrency(cuan, countryCode)}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("cuanDashboard.totalReward")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Geçen Haftanın Şanslıları - Hall of Fame */}
      <div className="mx-4 mt-6">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          <Trophy size={14} className="text-amber-500" />
          {t("cuanDashboard.hallOfFame")}
        </h2>
        <div className="card-radar rounded-2xl overflow-hidden border-amber-500/20">
          <div className="p-3 border-b border-amber-500/20 bg-amber-500/10">
            <p className="text-[10px] text-muted-foreground text-center">
              {countryCode === "DE" ? "10€ kazanan şanslı avcılar" : "100.000 Rp kazanan şanslı avcılar"}
            </p>
          </div>
          {winners.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              {t("cuanDashboard.noWinners")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {winners.map((w, i) => (
                <li key={w.id ?? i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/30 font-bold text-amber-700 text-xs shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {w.winner_name ?? w.user_id?.slice(0, 8) ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {w.draw_date} · Rp {(w.prize_amount ?? 100000).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Award size={16} className="text-amber-500 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
