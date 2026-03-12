import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { getLevelProgress } from "@/lib/levels";
import { Progress } from "@/components/ui/progress";

export default function UserDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();

  const { data: stats } = useUserStats(user?.id);

  const totalReceipts = stats?.total_receipts ?? 0;
  const level = stats?.level ?? 1;
  const levelProgress = getLevelProgress(totalReceipts);

  return (
    <div className="mx-4 mt-3">
      {/* Level progress */}
      <div className="mt-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            Level {level}
          </span>
          <span className="text-[10px] font-bold text-primary">
            {levelProgress.progress.toFixed(0)}%
          </span>
        </div>
        <Progress value={levelProgress.progress} className="h-2 bg-secondary" />
        <p className="mt-1 text-[9px] text-muted-foreground">
          {level >= 5
            ? "Max level!"
            : `${levelProgress.receiptsToNext} more receipts to Level ${levelProgress.next}`}
        </p>
      </div>

      <button
        onClick={() => navigate("/receipts")}
        className="mt-2 w-full rounded-lg border border-border bg-secondary/60 py-1.5 text-[11px] font-semibold text-foreground"
      >
        Lihat Riwayat
      </button>
    </div>
  );
}

