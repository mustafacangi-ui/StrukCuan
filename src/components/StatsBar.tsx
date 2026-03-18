import { Ticket, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";

/** Premium theme: violet/pink accents */
const TICKET_COLOR = "hsl(270 70% 60%)";
const CUAN_COLOR = "hsl(270 70% 60%)";

interface StatsBarProps {
  compact?: boolean;
}

export function StatsBar({ compact }: StatsBarProps) {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const cuan = stats?.cuan ?? 0;

  const handleProfileClick = () => {
    if (!isOnboarded) requireLogin("profile");
    else navigate("/settings");
  };

  const handleStatsClick = () => {
    if (isOnboarded) navigate("/cuan");
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleStatsClick} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-white/20 border border-white/25">
        <Ticket size={14} style={{ color: TICKET_COLOR }} />
        <span className="font-display text-xs font-semibold text-white">
          {weeklyTickets.toLocaleString()}
        </span>
        {!compact && <span className="text-[9px] text-white/90">Bilet</span>}
      </button>
      <button onClick={handleStatsClick} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-white/20 border border-white/25">
        <span className="text-[10px] font-semibold text-white">Cuan</span>
        <span className="font-display text-xs font-semibold" style={{ color: CUAN_COLOR }}>
          {cuan.toLocaleString()}
        </span>
      </button>
      <button
        onClick={handleProfileClick}
        className="rounded-lg bg-white/20 border border-white/25 p-2"
      >
        <Settings size={18} className="text-white" />
      </button>
    </div>
  );
}
