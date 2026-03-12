import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useLeaderboard } from "@/hooks/useUserStats";
import { Trophy, Medal, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";

export default function Leaderboard() {
  const navigate = useNavigate();
  const { isOnboarded } = useUser();
  const { data: leaderboard = [], isLoading, error } = useLeaderboard(50);

  useEffect(() => {
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isOnboarded, navigate]);

  if (!isOnboarded) return null;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal size={20} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={20} className="text-slate-300" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground w-5">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-28 max-w-[420px] mx-auto">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-secondary p-2"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground">
            Leaderboard
          </h1>
        </div>
      </div>

      <div className="mx-4 mt-4">
        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Memuat...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            Gagal memuat leaderboard
          </div>
        )}

        {!isLoading && !error && leaderboard.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Belum ada data. Upload struk untuk mulai!
          </div>
        )}

        {!isLoading && !error && leaderboard.length > 0 && (
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
                    Level {row.level ?? 1} · {row.total_receipts} struk
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {row.tiket ?? 0} tiket
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
