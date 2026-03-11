import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserPendingReceipts } from "@/hooks/useReceipts";
import { getLevelProgress } from "@/lib/levels";
import { Progress } from "@/components/ui/progress";

export default function UserDashboard() {
  const { user } = useUser();
  const userId = user?.id;
  const navigate = useNavigate();

  const { data: stats } = useUserStats(user?.id);
  const { data: pendingReceipts = [] } = useUserPendingReceipts(userId);

  const tiket = stats?.tiket ?? user?.tiket ?? 0;
  const totalReceipts = stats?.total_receipts ?? 0;
  const level = stats?.level ?? 1;
  const pendingCount = pendingReceipts.length;
  const levelProgress = getLevelProgress(totalReceipts);

  return (
    <div className="mx-4 mt-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-2">
          <p className="text-[9px] text-muted-foreground">Tiket Undian</p>
          <p className="font-display text-base font-bold text-foreground">
            {tiket.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2">
          <p className="text-[9px] text-muted-foreground">Total Struk</p>
          <p className="font-display text-base font-bold text-foreground">
            {totalReceipts}
          </p>
        </div>
      </div>

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
            ? "Level maksimal!"
            : `${levelProgress.receiptsToNext} struk lagi ke Level ${levelProgress.next}`}
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

