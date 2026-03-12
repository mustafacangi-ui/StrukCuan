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

export default function DailyMissionStreak() {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: mission } = useDailyMission(user?.id);
  const { data: stats } = useUserStats(user?.id);

  const missionCompleted = mission?.completed ?? false;
  const streak = stats?.current_streak ?? 0;
  const nextMilestone = STREAK_MILESTONES.find((m) => streak < m.days);

  const handleUpload = () => {
    if (isOnboarded) {
      navigate("/upload");
    } else {
      requireLogin("camera");
    }
  };

  return (
    <div className="mx-4 mt-4 space-y-3">
      {/* Daily Mission */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${missionCompleted ? "bg-primary/20" : "bg-secondary"}`}>
              {missionCompleted ? (
                <Check size={16} className="text-primary" />
              ) : (
                <Target size={16} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Daily Mission
              </p>
              <p className="text-[10px] text-muted-foreground">
                {missionCompleted ? "Done!" : "Upload 1 receipt today"}
              </p>
            </div>
          </div>
          {!missionCompleted && (
            <button
              onClick={handleUpload}
              className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
            >
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Streak Counter */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
              <Flame size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Streak
              </p>
              <p className="text-[10px] text-muted-foreground">
                {streak} days in a row
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold text-primary">
              {streak}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {nextMilestone
                ? `${nextMilestone.days - streak} more days +${nextMilestone.reward} ticket`
                : "Max!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
