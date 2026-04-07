import { useState, useEffect } from "react";
import { Ticket, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";

interface StatsBarProps {
  compact?: boolean;
}

export function StatsBar({ compact }: StatsBarProps) {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin, showDailyGiftModal } = useUser();
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    if (showDailyGiftModal) {
      // Sync with gift open animation (t=1.6s)
      const t1 = setTimeout(() => setGlowing(true), 1600);
      // Stop glowing shortly after (t=3.6s)
      const t2 = setTimeout(() => setGlowing(false), 3600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [showDailyGiftModal]);

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
        <Ticket size={16} className={`transition-all duration-500 ${glowing ? "text-pink-400 scale-125 drop-shadow-[0_0_12px_rgba(244,114,182,0.8)]" : "text-[#ef4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]"}`} />
        <motion.span 
          animate={glowing ? { 
            scale: [1, 1.3, 1], 
            color: ["#fff", "#f472b6", "#fff"] 
          } : {}}
          className="font-display text-xs font-semibold text-white relative"
        >
          {weeklyTickets.toLocaleString()}
          <AnimatePresence>
            {glowing && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: -16 }}
                exit={{ opacity: 0 }}
                className="absolute -top-4 -right-4 bg-gradient-to-br from-pink-400 to-purple-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg"
              >
                +1
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
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
