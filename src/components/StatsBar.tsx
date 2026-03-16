import { Ticket, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";

/** Renk paleti: Sarı (Bilet), Yeşil (Cuan), Kırmızı (Red Label) */
const TICKET_COLOR = "#facc15"; // Sarı - Bilet
const CUAN_COLOR = "#22c55e"; // Yeşil - Cuan

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
      <button onClick={handleStatsClick} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-black/30">
        <Ticket size={14} style={{ color: TICKET_COLOR }} />
        <span className="font-display text-xs font-semibold text-white">
          {weeklyTickets.toLocaleString()}
        </span>
        {!compact && <span className="text-[9px] text-white/80">Bilet</span>}
      </button>
      <button onClick={handleStatsClick} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-black/30">
        <span className="text-[10px] font-semibold text-white/90">Cuan</span>
        <span className="font-display text-xs font-semibold" style={{ color: CUAN_COLOR }}>
          {cuan.toLocaleString()}
        </span>
      </button>
      <button
        onClick={handleProfileClick}
        className="rounded-full bg-black/30 p-2"
      >
        <Settings size={18} className="text-white" />
      </button>
    </div>
  );
}
