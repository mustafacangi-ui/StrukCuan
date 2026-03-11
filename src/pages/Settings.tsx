import { useEffect } from "react";
import { ArrowLeft, Moon, Sun, Bell, BellOff, LogOut, Shield, User, Phone, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";

const Settings = () => {
  const navigate = useNavigate();
  const { user, isOnboarded, logout, theme, toggleTheme, pushNotifications, togglePushNotifications } = useUser();

  useEffect(() => {
    if (!isOnboarded) {
      navigate("/", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [isOnboarded, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!isOnboarded) return null;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button onClick={() => navigate("/")} className="rounded-full bg-secondary p-2">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Pengaturan</h1>
      </div>

      {/* Profile card */}
      <div className="mx-4 mt-4 rounded-xl border border-primary/30 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary glow-green">
            <span className="font-display text-2xl font-bold text-primary">
              {user?.nickname?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{user?.nickname || "User"}</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield size={10} className="text-primary" />
              <span className="text-[10px] font-bold text-primary glow-green-text">
                Level {user?.level || 1} · Struk Hunter
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Phone size={10} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{user?.phone || "+62..."}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings sections */}
      <div className="mx-4 mt-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Tampilan</p>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
              <div>
                <p className="text-sm font-semibold text-foreground">Mode {theme === "dark" ? "Gelap" : "Terang"}</p>
                <p className="text-[10px] text-muted-foreground">Ganti tampilan aplikasi</p>
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Notifikasi</p>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {pushNotifications ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-muted-foreground" />}
              <div>
                <p className="text-sm font-semibold text-foreground">Push Notifications</p>
                <p className="text-[10px] text-muted-foreground">Notifikasi promo & hadiah</p>
              </div>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={togglePushNotifications} />
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-neon-red mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Alert <span className="font-semibold text-neon-red">Promo Merah</span> dalam radius 3-5km dikirim via{" "}
                <span className="font-semibold text-foreground">Push Notification</span> (bukan SMS/WhatsApp) — gratis untuk kamu!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Akun</p>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl border border-destructive/30 bg-card p-4"
        >
          <LogOut size={16} className="text-destructive" />
          <span className="text-sm font-semibold text-destructive">Keluar</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
