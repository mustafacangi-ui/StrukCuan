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
      <div className="rounded-xl border border-white/20 bg-white/95 backdrop-blur-sm p-4 shadow-md">
        <p className="text-[9px] text-gray-500 mb-1">Your Level</p>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold text-gray-900">Level {level}</span>
          <span className="text-[10px] font-bold text-green-600">
            {levelProgress.progress.toFixed(0)}%
          </span>
        </div>
        <Progress value={levelProgress.progress} className="h-2 bg-gray-200 [&>div]:bg-green-500" />
        <p className="mt-1 text-[10px] text-gray-700">
          {level >= 5
            ? "Max level!"
            : `${levelProgress.receiptsToNext} receipts to Level ${levelProgress.next}`}
        </p>
      </div>

      {/* History */}
      <button
        onClick={() => navigate("/receipts")}
        className="w-full rounded-xl border border-white/20 bg-white/95 backdrop-blur-sm py-3 min-h-[48px] text-sm font-semibold text-gray-900 shadow-md hover:bg-white transition-colors"
      >
        View History
      </button>
    </div>
  );
}

