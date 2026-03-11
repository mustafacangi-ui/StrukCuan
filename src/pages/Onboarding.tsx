import { useState, useEffect } from "react";
import { Camera, Zap, ArrowRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const { login, isOnboarded } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState<"splash" | "signup">("splash");
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOnboarded) {
      navigate("/", { replace: true });
    }
  }, [isOnboarded, navigate]);

  const handleSignup = () => {
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

  if (step === "splash") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        {/* Logo area */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-breathing scale-150" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary glow-green">
            <Camera size={48} className="text-primary" />
          </div>
        </div>

        <h1 className="font-display text-4xl font-bold text-foreground mb-2 text-center">
          Struk<span className="text-primary glow-green-text">Cuan</span>
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-2">
          Foto struk belanja, kumpulkan cuan!
        </p>
        <div className="flex items-center gap-1.5 mb-10">
          <Zap size={12} className="text-primary" />
          <span className="text-[11px] text-primary/80">Bonus 2x untuk Promo Merah</span>
        </div>

        {/* Features */}
        <div className="w-full space-y-3 mb-10">
          {[
            { emoji: "📸", text: "Foto struk belanjamu" },
            { emoji: "💰", text: "Dapatkan Cuan Coins & Tiket Undian" },
            { emoji: "🎉", text: "Menangkan Grand Prize setiap minggu" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-lg">{f.emoji}</span>
              <span className="text-sm text-foreground">{f.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep("signup")}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base animate-pulse-glow"
        >
          Mulai Sekarang <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      <div className="w-full">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">Daftar Akun</h2>
        <p className="text-sm text-muted-foreground mb-8">Cuma butuh 2 hal, simpel!</p>

        {/* Phone */}
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nomor HP</label>
        <div className="flex items-center rounded-xl border border-border bg-card mb-4 overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-3 border-r border-border bg-secondary">
            <span className="text-sm font-semibold text-foreground">🇮🇩 +62</span>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setError("");
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 13));
            }}
            placeholder="812 3456 7890"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Nickname */}
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Panggilan</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setError("");
            setNickname(e.target.value.slice(0, 20));
          }}
          placeholder="Contoh: Siti"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
        />
        <p className="text-[10px] text-muted-foreground mb-6">Nama ini akan tampil di profil kamu</p>

        {error && (
          <p className="text-xs text-neon-red mb-4 glow-red-text">{error}</p>
        )}

        <button
          onClick={handleSignup}
          className="w-full rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base glow-green"
        >
          Masuk & Mulai Cuan 🚀
        </button>

        <button
          onClick={() => setStep("splash")}
          className="w-full mt-3 py-2 text-xs text-muted-foreground"
        >
          ← Kembali
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
