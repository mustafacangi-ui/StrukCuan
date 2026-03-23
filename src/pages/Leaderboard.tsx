import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useLeaderboard } from "@/hooks/useUserStats";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import { Medal, Trophy, Star } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import LegalFooter from "@/components/LegalFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

export default function Leaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading } = useUser();
  const { data: leaderboard = [], isLoading: leaderboardLoading, error } = useLeaderboard(user?.id, 50);
  const { data: winners = [] } = useLotteryWinners(5);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  if (!isOnboarded && !isLoading) return null;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal size={20} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={20} className="text-slate-300" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground w-5">{rank}</span>;
  };

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative">
      {/* Premium dark navy/purple background — matches Home screen */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: PREMIUM_PAGE_BACKGROUND }}
      />
      <PageHeader title={t("leaderboard.title")} onBack={() => navigate(-1)} />

      {/* ── Hall of Fame — horizontally scrolling winner cards ── */}
      {winners.length > 0 && (
        <div className="mt-4 mb-1">
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 mb-3">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "rgba(251,191,36,0.25)", border: "1px solid rgba(251,191,36,0.5)" }}
            >
              <Trophy size={13} className="text-amber-300" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300/90">
              {t("leaderboard.hallOfFame")}
            </span>
            <Star size={10} className="text-amber-400 animate-pulse" />
          </div>

          {/* Scrollable winner cards */}
          <div
            ref={scrollRef}
            className="flex gap-3 px-4 overflow-x-auto pb-1 scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {winners.map((w, i) => (
              <div
                key={w.id}
                className="flex-shrink-0 w-52 rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(180,83,9,0.10) 100%)",
                  border: "1px solid rgba(251,191,36,0.35)",
                  boxShadow: "0 0 20px rgba(251,191,36,0.12)",
                  animation: `slideInRight 0.4s ease-out ${i * 0.08}s both`,
                }}
              >
                {/* Glow orb */}
                <div
                  className="pointer-events-none absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-30"
                  style={{ background: "radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)" }}
                />

                {/* Rank badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                    style={
                      i === 0
                        ? { background: "rgba(251,191,36,0.3)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.6)" }
                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)" }
                    }
                  >
                    {i + 1}
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-amber-400/70">{t("leaderboard.winner")}</span>
                </div>

                {/* Winner name */}
                <p
                  className="font-display font-bold text-sm truncate mb-1"
                  style={{ color: i === 0 ? "#fbbf24" : "rgba(255,255,255,0.9)" }}
                >
                  {w.winner_name ?? "—"}
                </p>

                {/* Prize */}
                <p className="text-xs font-bold text-emerald-400">
                  Rp {(w.prize_amount ?? 100000).toLocaleString("id-ID")}
                </p>

                {/* Date */}
                {w.draw_date && (
                  <p className="text-[10px] text-white/35 mt-1">{w.draw_date}</p>
                )}
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="mx-4 mt-4 mb-1 h-px bg-white/8" />
        </div>
      )}

      <div className="mx-4 mt-4">
        {leaderboardLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {t("leaderboard.error")}
          </div>
        )}

        {!leaderboardLoading && !error && leaderboard.length === 0 && (
          <div className="card-radar rounded-2xl overflow-hidden">
            <EmptyState
              titleKey="empty.comingSoon"
              subtitleKey="empty.radarScanning"
              icon="radar"
            />
          </div>
        )}

        {!leaderboardLoading && !error && leaderboard.length > 0 && (
          <div className="space-y-2">
            {leaderboard.map((row, i) => (
              <div
                key={row.user_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex w-8 items-center justify-center">
                  {getRankIcon(i + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {row.nickname || "Anonim"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Level {row.level ?? 1} · {row.total_receipts} {t("leaderboard.receipts")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {row.tiket ?? 0} {t("common.tickets")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
