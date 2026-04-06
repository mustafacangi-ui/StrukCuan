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
        <p className="text-sm font-semibold text-foreground">Receipt Submitted!</p>
        <div className="flex flex-col items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-6 py-4">
          <span className="font-display text-lg font-bold text-orange-400">
            Pending Review
          </span>
          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
            Tickets will be added after<br />manual admin approval.
          </p>
        </div>
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Good luck!</p>
      </div>
    </div>
  );
}
