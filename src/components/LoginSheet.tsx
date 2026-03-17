import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { X, Phone, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleIcon } from "@/components/SocialIcons";

type AuthMethod = "phone" | "email";

const LoginSheet = () => {
  const { t } = useTranslation();
  const {
    showLoginSheet,
    dismissLogin,
    loginWithPhone,
    verifyOtp,
    loginWithEmail,
    loginWithGoogle,
  } = useUser();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showLoginSheet) return null;

  const handleGoogleLogin = async () => {
    setError("");
    setSuccessMsg("");
    if (!confirmAge) {
      setError(t("auth.errorConfirmAge"));
      return;
    }
    if (!agreeTerms) {
      setError(t("auth.errorAgreeTerms"));
      return;
    }
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? t("auth.errorLoginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    setSuccessMsg("");
    if (!agreeTerms) {
      setError(t("auth.errorAgreeTerms"));
      return;
    }
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError(t("auth.errorValidPhone"));
      return;
    }
    if (displayName.trim().length < 2) {
      setError(t("auth.errorDisplayNameMin"));
      return;
    }
    setLoading(true);
    try {
      await loginWithPhone(phone, displayName.trim());
      setOtpSent(true);
      setError("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? t("auth.errorOtpFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setSuccessMsg("");
    if (!otp || otp.length < 6) {
      setError("Masukkan kode OTP 6 digit");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, otp);
      setOtpSent(false);
      setOtp("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? t("auth.errorOtpWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError("");
    setSuccessMsg("");
    if (!confirmAge) {
      setError("Please confirm you are at least 18 years old");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to Terms of Service and Privacy Policy");
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
      setSuccessMsg(t("auth.successEmailLink"));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? t("auth.errorEmailLinkFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (authMethod === "phone") {
      if (otpSent) {
        handleVerifyOtp();
      } else {
        handleSendOtp();
      }
    } else {
      handleEmailLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={dismissLogin} />
      <div className="relative z-10 w-full max-w-[420px] rounded-t-2xl border-t border-border bg-card px-6 pt-4 pb-10 animate-slide-up max-h-[92vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <button onClick={dismissLogin} className="absolute top-4 right-5 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <h2 className="font-display text-xl font-bold text-foreground mb-1">
          {t("auth.huntPromoTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("auth.loginToUpload")}
        </p>

        {/* Social login */}
        <div className="mb-5">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-white text-gray-900 py-3.5 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon className="w-5 h-5" />
            <span>{t("auth.continueWithGoogle")}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative bg-card px-3">
            <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
          </div>
        </div>

        {/* Auth method toggle */}
        <div className="flex rounded-xl border border-border bg-secondary/30 p-1 mb-4">
          <button
            type="button"
            onClick={() => { setAuthMethod("phone"); setError(""); setOtpSent(false); setOtp(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              authMethod === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone size={16} />
            {t("auth.phoneNumber")}
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod("email"); setError(""); setOtpSent(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              authMethod === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail size={16} />
            {t("auth.email")}
          </button>
        </div>

        {/* Phone OTP flow */}
        {authMethod === "phone" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.phoneNumber")}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setError(""); setPhone(e.target.value); }}
                placeholder={t("auth.phonePlaceholder")}
                disabled={otpSent}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
            {!otpSent && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.displayName")}</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => { setError(""); setDisplayName(e.target.value.slice(0, 30)); }}
                  placeholder={t("auth.displayNamePlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
            {otpSent && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.otpCode")}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setError(""); setOtp(e.target.value.replace(/\D/g, "")); }}
                  placeholder="123456"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  {t("auth.resendOtp")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Email form */}
        {authMethod === "email" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setError(""); setEmail(e.target.value); }}
                placeholder={t("auth.emailPlaceholder")}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.displayName")}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setError(""); setDisplayName(e.target.value.slice(0, 30)); }}
                placeholder={t("auth.displayNamePlaceholder")}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Age confirmation */}
        <label className="flex items-start gap-3 cursor-pointer mb-3">
          <Checkbox
            checked={confirmAge}
            onCheckedChange={(v) => setConfirmAge(!!v)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            {t("auth.confirmAge")}
          </span>
        </label>

        {/* Terms checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <Checkbox
            checked={agreeTerms}
            onCheckedChange={(v) => setAgreeTerms(!!v)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            {t("auth.agreeTerms")}{" "}
            <Link to="/terms" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {t("auth.termsOfService")}
            </Link>
            {" "}{t("auth.and")}{" "}
            <Link to="/privacy" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {t("auth.privacyPolicy")}
            </Link>
          </span>
        </label>

        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        {successMsg && <p className="text-xs text-primary mb-3">{successMsg}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground text-base disabled:opacity-60"
        >
          {loading ? t("auth.processing") : t("auth.submit")}
        </button>
      </div>
    </div>
  );
};

export default LoginSheet;
