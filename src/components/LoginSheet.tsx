import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { X, Camera, Mail, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const LoginSheet = () => {
  const {
    showLoginSheet,
    dismissLogin,
    loginWithPhone,
    verifyOtp,
    loginWithEmail,
    pendingAction,
    authMode,
    setAuthMode,
  } = useUser();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showLoginSheet) return null;

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
        setError("Cek email untuk link login. Setelah login, tutup sheet ini.");
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
      dismissLogin();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Kode OTP salah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("input");
    setOtp("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={dismissLogin} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border-t border-primary/30 bg-card px-6 pt-4 pb-8 animate-slide-up">
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
        <p className="text-xs text-muted-foreground mb-5">
          {step === "verify" ? "Masukkan kode 6 digit yang dikirim via SMS" : "Cuma butuh 2 hal, simpel!"}
        </p>

        {step === "input" ? (
          <>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setAuthMode("phone"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1 ${
                  authMode === "phone" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Phone size={14} /> Phone OTP
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

            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
              {authMode === "phone" ? "Nomor HP" : "Email"}
            </label>
            {authMode === "phone" ? (
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
            ) : (
              <input
                type="email"
                value={email}
                onChange={(e) => { setError(""); setEmail(e.target.value); }}
                placeholder="email@example.com"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-3"
              />
            )}

            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nama Panggilan</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setError(""); setNickname(e.target.value.slice(0, 20)); }}
              placeholder="Contoh: Siti"
              className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-1"
            />
            <p className="text-[9px] text-muted-foreground mb-3">Nama ini akan tampil di profil kamu</p>

            <label className="flex items-start gap-2.5 cursor-pointer mb-4">
              <Checkbox
                checked={agreeTerms}
                onCheckedChange={(v) => setAgreeTerms(!!v)}
                className="mt-0.5"
              />
              <span className="text-[11px] text-muted-foreground">
                Saya setuju dengan{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {" "}dan{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {error && <p className="text-xs text-destructive mb-3">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 font-display font-bold text-primary-foreground text-sm disabled:opacity-60"
            >
              {loading ? "Mengirim..." : authMode === "phone" ? "Kirim Kode OTP" : "Kirim Link Login"}
            </button>
          </>
        ) : (
          <>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Kode OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => { setError(""); setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
              placeholder="123456"
              className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-4 text-center tracking-[0.5em]"
            />
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-primary py-3 font-display font-bold text-primary-foreground text-sm disabled:opacity-60 mb-2"
            >
              {loading ? "Memverifikasi..." : "Verifikasi"}
            </button>
            <button onClick={handleBack} className="w-full py-2 text-xs text-muted-foreground">
              ← Ganti nomor
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginSheet;
