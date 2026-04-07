import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Gift, CheckCircle2, Clock } from "lucide-react";
import { dailyRewardService } from "@/services/DailyRewardService";
import { CARD_BASE } from "@/lib/designTokens";
import { useUser } from "@/contexts/UserContext";

interface DailyGiftCardProps {
  userId: string | undefined;
}

export default function DailyGiftCard({ userId }: DailyGiftCardProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isClaimed, setIsClaimed] = useState(true); // Default to true while loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      console.log('[dailyGift] refreshing Daily Gift card state');
      console.log('[dailyGift] updating DailyGiftCard state');
      if (!userId) {
        setIsClaimed(true);
        setLoading(false);
        return;
      }
      const claimed = await dailyRewardService.isAlreadyClaimedToday(userId);
      console.log('[dailyGift] isAlreadyClaimedToday result', claimed);
      setIsClaimed(claimed);
      setLoading(false);
    };

    checkStatus();
  }, [userId, user?.tiket]); // Re-sync with Daily Gift card state whenever ticket balance changes

  if (loading && userId) return null;

  return (
    <div
      className={`${CARD_BASE} relative overflow-hidden transition-all duration-300 hover:scale-[1.01]`}
      style={{
        background: isClaimed
          ? "rgba(20,20,30,0.4)"
          : "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.1) 100%)",
        border: isClaimed
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(139,92,246,0.3)"
      }}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${!isClaimed ? 'animate-bounce-slow' : ''}`}
          style={{
            background: isClaimed
              ? "rgba(255,255,255,0.05)"
              : "rgba(139,92,246,0.2)",
            border: isClaimed
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(139,92,246,0.4)"
          }}
        >
          {isClaimed ? (
            <CheckCircle2 size={24} className="text-white/40" />
          ) : (
            <Gift size={24} className="text-[#a78bfa] drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-display font-bold text-sm tracking-tight ${isClaimed ? 'text-white/60' : 'text-white'}`}>
            {isClaimed ? "Hadiah harian sudah diambil 🎁" : "Hadiah gratis hari ini tersedia"}
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5 font-medium">
            {isClaimed
              ? "Kembali lagi besok untuk hadiah berikutnya."
              : "+1 hadiah harian"}
          </p>
        </div>

        {isClaimed && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 shrink-0">
            <Clock size={12} className="text-white/30" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">TOMORROW</span>
          </div>
        )}
      </div>

      {!isClaimed && (
        <div className="absolute top-0 right-0 p-2">
          <div className="w-2 h-2 rounded-full bg-[#ec4899] animate-ping" />
        </div>
      )}
    </div>
  );
}
