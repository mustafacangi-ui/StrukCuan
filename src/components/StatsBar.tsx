import { Ticket, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";

interface StatsBarProps {
  compact?: boolean;
}

export function StatsBar({ compact }: StatsBarProps) {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);

  const handleProfileClick = () => {
    if (!isOnboarded) requireLogin("profile");
    else navigate("/settings");
  };

  const handleStatsClick = () => {
    if (isOnboarded) navigate("/rewards");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleStatsClick}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-white/20 border border-white/25 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
      >
        <Ticket size={16} className="text-[#ef4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        <span className="font-display text-xs font-semibold text-white">
          {weeklyTickets.toLocaleString()}
        </span>
        <span className="text-[10px] font-medium text-white/90">Tickets</span>
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
