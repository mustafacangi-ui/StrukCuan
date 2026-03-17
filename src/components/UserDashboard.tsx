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
      <div className="card-radar rounded-2xl p-4">
        <p className="text-[10px] text-white/50 mb-1">Your Level</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">Level {level}</span>
          <span className="text-xs font-bold text-[#00FF88]">
            {levelProgress.progress.toFixed(0)}%
          </span>
        </div>
        <Progress value={levelProgress.progress} className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#00FF88] [&>div]:to-[#00cc6a]" />
        <p className="mt-2 text-xs text-white/60">
          {level >= 5
            ? "Max level!"
            : `${levelProgress.receiptsToNext} receipts to Level ${levelProgress.next}`}
        </p>
      </div>

      {/* History */}
      <button
        onClick={() => navigate("/receipts")}
        className="w-full card-radar rounded-2xl py-3.5 min-h-[48px] text-sm font-semibold text-white transition-all hover:border-[#00FF88]/30 hover:shadow-[0_0_20px_rgba(0,255,136,0.1)]"
      >
        View History
      </button>
    </div>
  );
}

