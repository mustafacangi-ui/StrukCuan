import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Bell, BellOff, LogOut, Shield, Phone, MapPin, Trophy, ShieldCheck, Trash2, AlertTriangle, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUpdateCountry } from "@/hooks/useUpdateCountry";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { CountrySelector } from "@/components/CountrySelector";
import LanguageSelector from "@/components/LanguageSelector";
import BottomNav from "@/components/BottomNav";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading, logout, refreshUser, theme, toggleTheme } = useUser();
  const updateCountry = useUpdateCountry();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Browser notifications hook
  const {
    isEnabled,
    isSupported,
    permission,
    enableNotifications,
    toggleNotifications,
  } = useBrowserNotifications();

  // State for notification button loading
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/home", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [isLoading, isOnboarded, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/home");
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      toast.success(t("settings.deleted"));
      navigate("/", { replace: true });
    } catch (e) {
      toast.error((e as Error)?.message ?? t("settings.deleteFailed"));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInput("");
    }
  };

  if (!isOnboarded && !isLoading) return null;

  return (
    <div className="min-h-screen max-w-[420px] mx-auto pb-28 relative">
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />
      <PageHeader title={t("settings.title")} onBack={() => navigate(-1)} />

      {/* Profile card */}
      <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary glow-green">
              <span className="font-display text-2xl font-bold text-primary">
                {user?.nickname?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : (
              <>
                <h2 className="font-display text-lg font-bold text-foreground">{user?.nickname || "User"}</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary glow-green-text">
                    {t("home.levelBadge", { level: user?.level || 1 })}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Phone size={10} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{user?.phone || "+62..."}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="mx-4 mt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
          {t("settings.language")}
        </p>
        <LanguageSelector variant="pills" />
      </div>

      {/* Ülke Seçici */}
      <div className="mx-4 mt-4">
        <CountrySelector
          value={user?.countryCode ?? "ID"}
          onChange={async (code) => {
            try {
              await updateCountry.mutateAsync(code);
              await refreshUser();
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          }}
          disabled={updateCountry.isPending}
        />
      </div>

      {/* Admin Panel - sadece adminlere görünür */}
      {isAdmin && (
        <button
          onClick={() => navigate("/admin")}
          className="mx-4 mt-4 w-full flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-display font-bold text-foreground">{t("settings.adminPanel")}</p>
            <p className="text-[10px] text-muted-foreground">{t("settings.adminPanelDesc")}</p>
          </div>
        </button>
      )}

      {/* Cuan Dashboard link */}
      <button
        onClick={() => navigate("/cuan")}
        className="mx-4 mt-4 w-full flex items-center gap-3 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-primary/10 p-4"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/30">
          <Trophy size={20} className="text-amber-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-display font-bold text-foreground">{t("settings.cuanDashboard")}</p>
          <p className="text-[10px] text-muted-foreground">{t("settings.cuanDashboardDesc")}</p>
        </div>
      </button>

      {/* Settings sections */}
      <div className="mx-4 mt-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{t("settings.display")}</p>
        <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
              <div>
                <p className="text-sm font-semibold text-foreground">{theme === "dark" ? t("settings.darkMode") : t("settings.lightMode")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.changeTheme")}</p>
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="mx-4 mt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
          {t("settings.notifications")}
        </p>
        <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
          {/* Enable Notifications Button */}
          <button
            onClick={async () => {
              if (!isSupported) {
                toast.error(t("settings.notificationsNotSupported"));
                return;
              }
              setNotifLoading(true);
              try {
                const success = await toggleNotifications();
                if (success) {
                  toast.success(t("settings.notificationsEnabled"));
                } else if (permission === "denied") {
                  toast.error(t("settings.notificationsDenied"));
                }
              } finally {
                setNotifLoading(false);
              }
            }}
            disabled={notifLoading || permission === "denied"}
            className="w-full flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isEnabled ? "bg-primary/20" : "bg-muted/30"}`}>
                {isEnabled ? (
                  <BellRing size={18} className="text-primary" />
                ) : permission === "denied" ? (
                  <BellOff size={18} className="text-muted-foreground" />
                ) : (
                  <Bell size={18} className="text-muted-foreground" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {isEnabled
                    ? t("settings.notificationsEnabled")
                    : permission === "denied"
                    ? t("settings.notificationsBlocked")
                    : t("settings.enableNotifications")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isEnabled
                    ? t("settings.notificationsActive")
                    : permission === "denied"
                    ? t("settings.notificationsBlockedDesc")
                    : isSupported
                    ? t("settings.enableNotificationsDesc")
                    : t("settings.notificationsNotSupported")}
                </p>
              </div>
            </div>
            {notifLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            ) : isEnabled ? (
              <span className="text-xs font-medium text-primary px-2 py-1 rounded-full bg-primary/10">
                {t("common.enabled")}
              </span>
            ) : permission === "denied" ? (
              <span className="text-xs font-medium text-muted-foreground">
                {t("common.blocked")}
              </span>
            ) : null}
          </button>

          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-neon-red mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t("settings.redAlertDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{t("settings.account")}</p>
        <div className="space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl p-4"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <LogOut size={16} className="text-destructive" />
            <span className="text-sm font-semibold text-destructive">{t("settings.logout")}</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 rounded-xl p-4"
            style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}
          >
            <Trash2 size={16} className="text-red-500" />
            <div className="text-left">
              <p className="text-sm font-semibold text-red-500">{t("settings.deleteAccount")}</p>
              <p className="text-[10px] text-muted-foreground">{t("settings.deleteAccountDesc")}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Hesap silme onay modalı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "rgba(15,15,25,0.98)", border: "1px solid rgba(220,38,38,0.4)" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <h3 className="font-display font-bold text-foreground">{t("settings.deleteConfirmTitle")}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {t("settings.deleteConfirmBody")}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {t("settings.deleteConfirmPrompt")} <span className="font-bold text-red-400">DELETE</span>
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={t("settings.deleteConfirmPlaceholder")}
              className="w-full rounded-lg border border-red-500/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold bg-secondary text-foreground"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE" || isDeleting}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? t("settings.deleting") : t("settings.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Settings;
