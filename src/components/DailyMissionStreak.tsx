import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useDailyMission } from "@/hooks/useDailyMission";
import { useUserStats } from "@/hooks/useUserStats";
import { Target, Flame, Check } from "lucide-react";

const STREAK_MILESTONES = [
  { days: 3, reward: 1 },
  { days: 7, reward: 2 },
  { days: 14, reward: 3 },
];

interface DailyMissionStreakProps {
  onOpenScanner?: () => void;
}

export default function DailyMissionStreak({ onOpenScanner }: DailyMissionStreakProps) {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: mission } = useDailyMission(user?.id);
  const { data: stats } = useUserStats(user?.id);

  const missionCompleted = mission?.completed ?? false;
  const streak = stats?.current_streak ?? 0;
  const nextMilestone = STREAK_MILESTONES.find((m) => streak < m.days);

  const handleUpload = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    onOpenScanner?.() ?? navigate("/");
  };

  return (
    <div className="mx-4 space-y-4">
      {/* Daily Mission */}
      <div className="rounded-xl border border-white/20 bg-white/95 backdrop-blur-sm p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${missionCompleted ? "bg-green-100" : "bg-gray-100"}`}>
              {missionCompleted ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Target size={16} className="text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">
                Daily Mission
              </p>
              <p className="text-[10px] text-gray-700">
                {missionCompleted ? "Done!" : "Upload 1 receipt today"}
              </p>
              {!missionCompleted && (
                <p className="text-[9px] text-green-600 font-medium">Reward: +1 ticket</p>
              )}
            </div>
          </div>
          {!missionCompleted && (
            <button
              onClick={handleUpload}
              className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 min-h-[48px] text-[10px] font-bold text-white transition-colors"
            >
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Streak Counter */}
      <div className="rounded-xl border border-white/20 bg-white/95 backdrop-blur-sm p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
              <Flame size={16} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">Streak</p>
              <p className="text-[10px] text-gray-700">{streak} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500">
              {nextMilestone
                ? `${nextMilestone.days - streak} more days → +${nextMilestone.reward} ticket`
                : "Max!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
