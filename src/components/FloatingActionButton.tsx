import { Camera, Zap, X, Check, Ticket } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/contexts/UserContext";

const FloatingActionButton = () => {
  const { isOnboarded, requireLogin, pendingAction } = useUser();
  const [showBonus, setShowBonus] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isNearPromoMerah] = useState(true);

  const scrollToReceiptScanner = () => {
    window.dispatchEvent(new CustomEvent("scroll-to-receipt-scanner"));
  };

  const handleClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    scrollToReceiptScanner();
    if (isNearPromoMerah) {
      setShowBonus(true);
      setTimeout(() => {
        setShowBonus(false);
        setShowSuccess(true);
      }, 1800);
    } else {
      setShowSuccess(true);
    }
  };

  // After login, if pending action was camera, auto-trigger
  // (handled via effect would be better but keeping simple)

  return (
    <>
      {showBonus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-primary/40 bg-card p-8 glow-green">
            <button onClick={() => { setShowBonus(false); setShowSuccess(true); }} className="absolute top-2 right-2 text-muted-foreground">
              <X size={16} />
            </button>
            <div className="rounded-full bg-primary/20 p-4 glow-green animate-pulse-glow">
              <Zap size={40} className="text-primary" />
            </div>
            <p className="font-display text-2xl font-bold text-primary glow-green-text">Bonus 2x Active!</p>
            <p className="text-xs text-muted-foreground text-center">Promo Merah terdeteksi!<br/>Cuan 2x lipat untuk struk ini 🔥</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-primary/40 bg-card p-8 mx-6 glow-green">
            <button onClick={() => setShowSuccess(false)} className="absolute top-2 right-2 text-muted-foreground">
              <X size={16} />
            </button>
            <div className="rounded-full bg-primary/20 p-4 glow-green">
              <Check size={36} className="text-primary" />
            </div>
            <p className="font-display text-xl font-bold text-primary glow-green-text">Struk Berhasil Dikirim!</p>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2">
              <Ticket size={14} className="text-primary" />
              <p className="text-xs text-foreground font-semibold">
                Kamu mendapatkan <span className="text-primary">+1 Tiket</span> untuk Undian Minggu ini!
              </p>
            </div>
            {isNearPromoMerah && (
              <div className="flex items-center gap-2 rounded-lg bg-neon-red/10 border border-neon-red/20 px-4 py-2">
                <Zap size={14} className="text-neon-red" />
                <p className="text-xs text-foreground font-semibold">
                  Bonus <span className="text-neon-red">2x Cuan</span> dari Promo Merah!
                </p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">ID Struk: #RX{Math.random().toString(36).slice(2, 6).toUpperCase()}</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="mt-1 w-full rounded-lg bg-primary py-2.5 font-display font-bold text-primary-foreground text-sm"
            >
              Lanjut Berburu Cuan 🚀
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center">
        {isNearPromoMerah && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neon-red/90 px-3 py-1 text-[10px] font-bold text-accent-foreground glow-red animate-pulse-red">
            Promo Merah = Bonus Cuan 2x 🔥
          </div>
        )}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-breathing scale-150" />
          <button
            onClick={handleClick}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary glow-green animate-breathing shadow-[0_0_40px_hsl(147_100%_60%/0.6),0_0_80px_hsl(147_100%_60%/0.3)]"
          >
            <Camera size={28} className="text-primary-foreground" />
          </button>
          <div className={`absolute -top-1 -right-3 flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 ${
            isNearPromoMerah
              ? "border-primary bg-primary/20 glow-green"
              : "border-muted bg-muted/50 opacity-40"
          }`}>
            <Zap size={8} className={isNearPromoMerah ? "text-primary" : "text-muted-foreground"} />
            <span className={`text-[8px] font-bold ${isNearPromoMerah ? "text-primary glow-green-text" : "text-muted-foreground"}`}>2x</span>
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] font-semibold text-primary glow-green-text">Ambil Foto</p>
      </div>
    </>
  );
};

export default FloatingActionButton;
