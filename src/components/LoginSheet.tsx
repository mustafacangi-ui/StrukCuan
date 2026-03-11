import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { X, Camera } from "lucide-react";

const LoginSheet = () => {
  const { showLoginSheet, dismissLogin, login, pendingAction } = useUser();
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  if (!showLoginSheet) return null;

  const handleSubmit = () => {
    if (phone.length < 8) {
      setError("Nomor HP minimal 8 digit");
      return;
    }
    if (nickname.trim().length < 2) {
      setError("Nama panggilan minimal 2 karakter");
      return;
    }
    login("+62" + phone, nickname.trim());
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={dismissLogin} />
      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border-t border-primary/30 bg-card px-6 pt-4 pb-8 animate-slide-up shadow-[0_-10px_40px_hsl(147_100%_60%/0.1)]">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <button onClick={dismissLogin} className="absolute top-4 right-5 text-muted-foreground">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Camera size={18} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">
            {pendingAction === "camera" ? "Login untuk Ambil Foto" : "Login ke Akun"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Cuma butuh 2 hal, simpel!</p>

        {/* Phone */}
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nomor HP</label>
        <div className="flex items-center rounded-xl border border-border bg-secondary/50 mb-3 overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2.5 border-r border-border">
            <span className="text-xs font-semibold text-foreground">🇮🇩 +62</span>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setError(""); setPhone(e.target.value.replace(/\D/g, "").slice(0, 13)); }}
            placeholder="812 3456 7890"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Nickname */}
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nama Panggilan</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => { setError(""); setNickname(e.target.value.slice(0, 20)); }}
          placeholder="Contoh: Siti"
          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-1"
        />
        <p className="text-[9px] text-muted-foreground mb-4">Nama ini akan tampil di profil kamu</p>

        {error && <p className="text-xs text-neon-red mb-3 glow-red-text">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full rounded-xl bg-primary py-3 font-display font-bold text-primary-foreground text-sm glow-green"
        >
          Masuk & Mulai Cuan 🚀
        </button>
      </div>
    </div>
  );
};

export default LoginSheet;
