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
      <div className="card-radar rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${missionCompleted ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10"}`}>
              {missionCompleted ? (
                <Check size={18} className="text-primary" />
              ) : (
                <Target size={18} className="text-white/70" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Daily Mission</p>
              <p className="text-xs text-white/60">
                {missionCompleted ? "Done!" : "Upload 1 receipt today"}
              </p>
              {!missionCompleted && (
                <p className="text-[10px] text-primary font-medium mt-0.5">Reward: +1 ticket</p>
              )}
            </div>
          </div>
          {!missionCompleted && (
            <button
              onClick={handleUpload}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white transition-all hover:shadow-[0_0_16px_rgba(139,92,246,0.3)]"
            >
              <span className="absolute inset-0 rounded-xl border-2 border-primary/50 animate-radar-sweep pointer-events-none" />
              <span className="relative z-10">Upload</span>
            </button>
          )}
        </div>
      </div>

      {/* Streak Counter */}
      <div className="card-radar rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30">
              <Flame size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Streak</p>
              <p className="text-xs text-white/60">{streak} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/50">
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
