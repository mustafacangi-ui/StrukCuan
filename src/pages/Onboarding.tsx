import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Camera, ArrowRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleIcon, AppleIcon } from "@/components/SocialIcons";

const Onboarding = () => {
  const { loginWithGoogle, loginWithApple, loginWithEmail, isOnboarded } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState<"splash" | "signup">("splash");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOnboarded) {
      navigate("/", { replace: true });
    }
  }, [isOnboarded, navigate]);

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setError("");
    if (!agreeTerms) {
      setError("Centang persetujuan Terms & Privacy Policy");
      return;
    }
    setLoading(true);
    try {
      if (provider === "google") {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Gagal login. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError("");
    if (!agreeTerms) {
      setError("Centang persetujuan Terms & Privacy Policy");
      return;
    }
    if (!email.includes("@")) {
      setError("Masukkan email yang valid");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Nama tampilan minimal 2 karakter");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email, displayName.trim());
      setError("");
      setError("Cek email untuk link login. Setelah login, kamu akan diarahkan ke beranda.");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Gagal mengirim link. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "splash") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-[420px] mx-auto">
        <div className="relative mb-8">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary shadow-primary">
            <Camera size={40} className="text-primary" />
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-2 text-center">
          Struk<span className="text-primary">Cuan</span>
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          Foto struk belanja, kumpulkan tiket undian!
        </p>

        <div className="w-full space-y-3 mb-8">
          {[
            { emoji: "📸", text: "Foto struk belanjamu" },
            { emoji: "🎫", text: "Dapatkan tiket undian mingguan" },
            { emoji: "🎉", text: "Menangkan voucher 100.000 Rp" },
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8 max-w-[420px] mx-auto">
      <div className="w-full">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">
          Daftar Akun
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pilih cara login yang paling mudah
        </p>

        {/* Social login buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-white text-gray-900 py-3.5 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
          <button
            onClick={() => handleSocialLogin("apple")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-black text-white py-3.5 font-medium text-sm hover:bg-gray-900 transition-colors disabled:opacity-60"
          >
            <AppleIcon className="w-5 h-5" />
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative bg-background px-3">
            <span className="text-xs text-muted-foreground">atau</span>
          </div>
        </div>

        {/* Email form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setError(""); setEmail(e.target.value); }}
              placeholder="nama@email.com"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Nama tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setError(""); setDisplayName(e.target.value.slice(0, 30)); }}
              placeholder="Contoh: Siti"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Terms checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <Checkbox
            checked={agreeTerms}
            onCheckedChange={(v) => setAgreeTerms(!!v)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Saya setuju dengan{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}dan{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </span>
        </label>

        {error && (
          <p className="text-xs text-destructive mb-4">{error}</p>
        )}

        <button
          onClick={handleEmailLogin}
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base disabled:opacity-60"
        >
          {loading ? "Mengirim..." : "Kirim Link Login"}
        </button>

        <button
          onClick={() => setStep("splash")}
          className="w-full mt-4 py-2 text-xs text-muted-foreground"
        >
          ← Kembali
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
