import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useLeaderboard } from "@/hooks/useUserStats";
import { Trophy, ChevronRight } from "lucide-react";

export default function LeaderboardPreview() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: leaderboard = [], isLoading } = useLeaderboard(user?.id, 3);

  if (!user || isLoading || leaderboard.length === 0) return null;

  return (
    <button
      onClick={() => navigate("/leaderboard")}
      className="mx-4 w-[calc(100%-2rem)] rounded-xl border border-white/20 bg-white/95 backdrop-blur-sm p-4 text-left shadow-md"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-green-500" />
          <span className="text-xs font-bold text-gray-900">Leaderboard</span>
        </div>
        <ChevronRight size={14} className="text-gray-500" />
      </div>
      <div className="flex flex-col gap-1">
        {leaderboard.slice(0, 3).map((row, i) => (
          <div key={row.user_id} className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">
              #{i + 1} {row.nickname || "Anonim"}
            </span>
            <span className="font-semibold text-gray-900">
              {row.total_receipts} receipts
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}
