import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Camera, Zap, ArrowRight, Phone, Mail } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

const Onboarding = () => {
  const { loginWithPhone, verifyOtp, loginWithEmail, isOnboarded, authMode, setAuthMode } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState<"splash" | "signup" | "verify">("splash");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [otp, setOtp] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOnboarded) {
      navigate("/", { replace: true });
    }
  }, [isOnboarded, navigate]);

  const handleSendOtp = async () => {
    setError("");
    if (!agreeTerms) {
      setError("Centang persetujuan Terms & Privacy Policy");
      return;
    }
    if (nickname.trim().length < 2) {
      setError("Nama panggilan minimal 2 karakter");
      return;
    }
    if (authMode === "phone") {
      if (phone.replace(/\D/g, "").length < 8) {
        setError("Nomor HP minimal 8 digit");
        return;
      }
    } else {
      if (!email.includes("@")) {
        setError("Masukkan email yang valid");
        return;
      }
    }

    setLoading(true);
    try {
      if (authMode === "phone") {
        await loginWithPhone(phone, nickname.trim());
        setStep("verify");
      } else {
        await loginWithEmail(email, nickname.trim());
        setError("");
        setError("Cek email untuk link login. Setelah login, kamu akan diarahkan ke beranda.");
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Gagal mengirim. Coba email jika phone tidak tersedia.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Masukkan 6 digit kode OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyOtp(phone, otp);
      navigate("/", { replace: true });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Kode OTP salah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "splash") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        <div className="relative mb-8">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary shadow-primary">
            <Camera size={48} className="text-primary" />
          </div>
        </div>

        <h1 className="font-display text-4xl font-bold text-foreground mb-2 text-center">
          Struk<span className="text-primary">Cuan</span>
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-2">
          Foto struk belanja, kumpulkan cuan!
        </p>
        <div className="flex items-center gap-1.5 mb-10">
          <Zap size={12} className="text-primary" />
          <span className="text-[11px] text-primary/80">Bonus 2x untuk Promo Merah</span>
        </div>

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
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base"
        >
          Mulai Sekarang <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">Verifikasi OTP</h2>
        <p className="text-sm text-muted-foreground mb-6">Masukkan kode 6 digit yang dikirim via SMS</p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => { setError(""); setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
          placeholder="123456"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-4 text-center tracking-[0.5em]"
        />
        {error && <p className="text-xs text-destructive mb-4">{error}</p>}
        <button
          onClick={handleVerifyOtp}
          disabled={loading || otp.length !== 6}
          className="w-full rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base disabled:opacity-60 mb-2"
        >
          {loading ? "Memverifikasi..." : "Verifikasi"}
        </button>
        <button onClick={() => setStep("signup")} className="w-full py-2 text-xs text-muted-foreground">
          ← Ganti nomor
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      <div className="w-full">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">Daftar Akun</h2>
        <p className="text-sm text-muted-foreground mb-6">Cuma butuh 2 hal, simpel!</p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setAuthMode("phone"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1 ${
              authMode === "phone" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Phone size={14} /> Phone
          </button>
          <button
            onClick={() => { setAuthMode("email"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1 ${
              authMode === "email" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Mail size={14} /> Email
          </button>
        </div>

        {authMode === "phone" ? (
          <>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nomor HP</label>
            <div className="flex items-center rounded-xl border border-border bg-card mb-4 overflow-hidden">
              <div className="flex items-center gap-1 px-3 py-3 border-r border-border bg-secondary">
                <span className="text-sm font-semibold text-foreground">🇮🇩 +62</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setError(""); setPhone(e.target.value.replace(/\D/g, "").slice(0, 13)); }}
                placeholder="812 3456 7890"
                className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </>
        ) : (
          <>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setError(""); setEmail(e.target.value); }}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-4"
            />
          </>
        )}

        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Panggilan</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => { setError(""); setNickname(e.target.value.slice(0, 20)); }}
          placeholder="Contoh: Siti"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
        />
        <p className="text-[10px] text-muted-foreground mb-3">Nama ini akan tampil di profil kamu</p>

        <label className="flex items-start gap-2.5 cursor-pointer mb-4">
          <Checkbox checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(!!v)} className="mt-0.5" />
          <span className="text-[11px] text-muted-foreground">
            Saya setuju dengan{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}dan{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </span>
        </label>

        {error && <p className="text-xs text-destructive mb-4">{error}</p>}

        <button
          onClick={handleSendOtp}
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base disabled:opacity-60"
        >
          {loading ? "Mengirim..." : authMode === "phone" ? "Kirim Kode OTP" : "Kirim Link Login"}
        </button>

        <button onClick={() => setStep("splash")} className="w-full mt-3 py-2 text-xs text-muted-foreground">
          ← Kembali
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
