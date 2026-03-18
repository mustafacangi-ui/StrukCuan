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
    <div className="mx-4 space-y-4">
      {/* Level Progress */}
      <div className="rounded-2xl p-6 bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl ring-1 ring-white/10">
        <p className="text-[10px] text-white/80 mb-1">Your Level</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">Level {level}</span>
          <span className="text-xs font-bold text-primary">
            {levelProgress.progress.toFixed(0)}%
          </span>
        </div>
        <Progress value={levelProgress.progress} className="h-2 bg-black/40 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-green-500" />
        <p className="mt-2 text-xs text-white/80">
          {level >= 5
            ? "Max level!"
            : `${levelProgress.receiptsToNext} receipts to Level ${levelProgress.next}`}
        </p>
      </div>

      {/* History */}
      <button
        onClick={() => navigate("/receipts")}
        className="w-full rounded-2xl py-3.5 min-h-[48px] text-sm font-semibold text-white transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl ring-1 ring-white/10"
      >
        View History
      </button>
    </div>
  );
}

