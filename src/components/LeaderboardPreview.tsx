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
      className="mx-4 w-[calc(100%-2rem)] card-radar rounded-2xl p-4 text-left transition-all hover:border-primary/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30">
            <Trophy size={16} className="text-amber-400" />
          </div>
          <span className="text-sm font-bold text-white">Leaderboard</span>
        </div>
        <ChevronRight size={16} className="text-white/50" />
      </div>
      <div className="flex flex-col gap-2">
        {leaderboard.slice(0, 3).map((row, i) => (
          <div key={row.user_id} className="flex items-center justify-between text-xs">
            <span className="text-white/70">
              #{i + 1} {row.nickname || "Anonim"}
            </span>
            <span className="font-semibold text-white">
              {row.total_receipts} receipts
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}
