import { Receipt, ChevronRight, Coins, Ticket } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface HistoryItemProps {
  store: string;
  date: string;
  amount: string;
  points: string;
  tickets: string;
  isPromoMerah?: boolean;
}

const HistoryItem = ({ store, date, amount, points, tickets, isPromoMerah }: HistoryItemProps) => (
  <div className={`flex items-center justify-between rounded-xl border p-3 ${isPromoMerah ? 'border-neon-red/30 bg-card' : 'border-border bg-card'}`}>
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isPromoMerah ? 'bg-neon-red/15' : 'bg-secondary'}`}>
        <Receipt size={16} className={isPromoMerah ? 'text-neon-red' : 'text-muted-foreground'} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{store}</p>
        <p className="text-[10px] text-muted-foreground">{date} · {amount}</p>
        <div className="mt-1 flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <Coins size={10} className="text-yellow-400" />
            <span className="text-[10px] font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">+{points}</span>
          </div>
          <div className="flex items-center gap-1">
            <Ticket size={10} className="text-neon-red" />
            <span className="text-[10px] font-bold text-neon-red">+{tickets}</span>
          </div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className="text-right">
        {isPromoMerah ? (
          <p className="text-[9px] font-bold text-neon-red glow-red-text">Bonus 2x! 🔥</p>
        ) : (
          <p className="text-[9px] font-medium text-muted-foreground">Reward 1x</p>
        )}
      </div>
      <ChevronRight size={14} className="text-muted-foreground" />
    </div>
  </div>
);

const HistoryTab = () => {
  const { user } = useUser();
  const isNew = user?.isNewUser;

  if (isNew) {
    return (
      <div className="mx-4 mt-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
          <Receipt size={28} className="text-muted-foreground" />
        </div>
        <p className="font-display text-base font-bold text-foreground mb-1">Belum Ada Riwayat</p>
        <p className="text-xs text-muted-foreground">
          Take your first receipt photo to start earning tickets! 📸
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt size={16} className="text-primary" />
        <h2 className="font-display text-sm font-bold text-foreground">Receipt History</h2>
      </div>
      <div className="flex flex-col gap-2">
        <HistoryItem store="Indomaret Sudirman" date="8 Mar 2026" amount="Rp 45.000" points="900" tickets="9" isPromoMerah />
        <HistoryItem store="Alfamart Thamrin" date="7 Mar 2026" amount="Rp 32.000" points="320" tickets="3" />
        <HistoryItem store="Giant Kuningan" date="7 Mar 2026" amount="Rp 120.000" points="2.400" tickets="12" isPromoMerah />
        <HistoryItem store="Indomaret Gatot Subroto" date="6 Mar 2026" amount="Rp 28.500" points="285" tickets="2" />
      </div>
    </div>
  );
};

export default HistoryTab;
