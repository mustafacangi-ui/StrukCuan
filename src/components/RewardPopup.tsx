import { useEffect } from "react";
import { Ticket } from "lucide-react";

interface RewardPopupProps {
  onClose: () => void;
}

export default function RewardPopup({ onClose }: RewardPopupProps) {
  useEffect(() => {
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 flex flex-col items-center gap-4 rounded-2xl border border-primary/40 bg-card p-6 shadow-primary animate-fade-in">
        <p className="text-sm font-semibold text-foreground">Receipt Successful!</p>
        <div className="flex items-center gap-2 rounded-lg bg-primary/20 px-6 py-3 animate-pulse">
          <Ticket size={24} className="text-primary" />
          <span className="font-display text-xl font-bold text-primary">
            +1 Lottery Ticket
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">Good luck this week!</p>
      </div>
    </div>
  );
}
