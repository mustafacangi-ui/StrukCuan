import { Wallet, Ticket } from "lucide-react";

const StatsCards = () => {
  return (
    <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-full bg-primary/15 p-1.5">
            <Wallet size={14} className="text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Saldo Kamu</span>
        </div>
        <p className="font-display text-2xl font-bold text-foreground">25.500</p>
        <p className="text-[10px] text-primary mt-1">+Rp1.500 hari ini</p>
      </div>
      {/* Gold foil ticket counter */}
      <div className="rounded-xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-card to-yellow-600/5 p-3 shadow-[0_0_15px_hsl(45_100%_50%/0.15)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-full bg-yellow-500/20 p-1.5">
            <Ticket size={14} className="text-yellow-400" />
          </div>
          <span className="text-xs text-muted-foreground">Your Lottery Tickets</span>
        </div>
        <p className="font-display text-2xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 bg-clip-text text-transparent">1.200</p>
        <p className="text-[10px] text-yellow-400 mt-1">+500 minggu ini ✨</p>
      </div>
    </div>
  );
};

export default StatsCards;
