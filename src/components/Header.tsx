import { Bell, Settings, Shield, Coins, Ticket, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";

const Header = () => {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();

  const { data: stats } = useUserStats(user?.phone);
  const { data: notifications = [] } = useNotifications(user?.phone);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markRead = useMarkNotificationsRead(user?.phone);
  const [showNotifications, setShowNotifications] = useState(false);

  const cuan = stats?.cuan ?? user?.cuan ?? 0;
  const tiket = stats?.tiket ?? user?.tiket ?? 0;
  const nickname = user?.nickname ?? "Tamu";
  const level = user?.level ?? 0;

  const handleProfileClick = () => {
    if (!isOnboarded) {
      requireLogin("profile");
    } else {
      navigate("/settings");
    }
  };

  // Dynamic online user count
  const [onlineCount, setOnlineCount] = useState(342);

  useEffect(() => {
    const id = setInterval(() => {
      setOnlineCount((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.max(280, Math.min(420, prev + delta));
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-4 pt-3 pb-2">
      {/* LIVE indicator */}
      <div className="flex items-center justify-end gap-1.5 mb-2">
        <span className="h-2 w-2 rounded-full bg-neon-red animate-pulse" />
        <span className="text-[10px] font-bold text-neon-red tracking-wider">LIVE</span>
        <span className="text-[10px] font-mono text-muted-foreground">: {onlineCount.toLocaleString("id-ID")}</span>
      </div>
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 shadow-[0_0_12px_hsl(45_100%_50%/0.15)]">
          <Coins size={14} className="text-yellow-400" />
          <span className="font-display text-xs font-bold bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 bg-clip-text text-transparent">
            {cuan.toLocaleString("id-ID")}
          </span>
          <span className="text-[9px] text-yellow-400/70">Cuan</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-neon-red/40 bg-neon-red/10 px-3 py-1.5 shadow-[0_0_12px_hsl(0_100%_61%/0.15)]">
          <Ticket size={14} className="text-neon-red" />
          <span className="font-display text-xs font-bold text-neon-red glow-red-text">
            {tiket.toLocaleString("id-ID")}
          </span>
          <span className="text-[9px] text-neon-red/70">Tiket</span>
        </div>
      </div>
      {/* User row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleProfileClick}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary glow-green"
          >
            {isOnboarded ? (
              <span className="font-display text-lg font-bold text-primary">
                {nickname[0]?.toUpperCase()}
              </span>
            ) : (
              <User size={20} className="text-primary" />
            )}
            {isOnboarded && (
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <span className="text-[8px] font-bold text-primary-foreground">{level}</span>
              </div>
            )}
          </button>
          <div>
            <p className="text-sm text-muted-foreground">
              {isOnboarded ? "Selamat siang," : "Selamat datang!"}
            </p>
            <h1 className="font-display text-lg font-bold text-foreground">{nickname}</h1>
            {isOnboarded ? (
              <button
                onClick={handleProfileClick}
                className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 glow-green"
              >
                <Shield size={10} className="text-primary" />
                <span className="text-[10px] font-bold text-primary glow-green-text">
                  Level {level} · Struk Hunter
                </span>
              </button>
            ) : (
              <button
                onClick={() => requireLogin("camera")}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 glow-green shadow-[0_0_20px_hsl(147_100%_60%/0.4)] animate-pulse-glow"
              >
                <Ticket size={12} className="text-primary-foreground" />
                <span className="text-[10px] font-bold text-primary-foreground tracking-wide">UPLOAD STRUK → DAPAT TIKET</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              className="relative rounded-full bg-secondary p-2"
              onClick={() => {
                setShowNotifications((v) => !v);
                if (unreadCount > 0) {
                  markRead.mutate();
                }
              }}
            >
              <Bell size={18} className="text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-neon-red px-0.5">
                  <span className="text-[8px] font-bold text-accent-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-lg z-40">
                <div className="max-h-64 overflow-y-auto py-2">
                  {notifications.length === 0 && (
                    <div className="px-3 py-2 text-[10px] text-muted-foreground">
                      Tidak ada notifikasi.
                    </div>
                  )}
                  {notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className="px-3 py-2 text-[10px] border-b border-border/40 last:border-b-0"
                    >
                      <p className="font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleProfileClick} className="rounded-full bg-secondary p-2">
            <Settings size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
