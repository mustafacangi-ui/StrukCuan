import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useLeaderboard } from "@/hooks/useUserStats";
import { Medal } from "lucide-react";
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
