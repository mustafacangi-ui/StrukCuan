import { Bell, Settings, Shield, Ticket, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";

const Header = () => {
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading, requireLogin } = useUser();

  const { data: stats } = useUserStats(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markRead = useMarkNotificationsRead(user?.id);
  const [showNotifications, setShowNotifications] = useState(false);

  const tiket = stats?.tiket ?? user?.tiket ?? 0;
  const nickname = isLoading ? "Loading..." : (user?.nickname ?? "Guest");
  const level = stats?.level ?? user?.level ?? 1;

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

  const cuan = stats?.cuan ?? 0;

  return (
    <div className="px-4 pt-3 pb-2">
      <div
        className="rounded-[18px] p-3 px-4"
        style={{
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: "#2b2b2b", color: "#ff6b6b" }}
            >
              <Ticket size={14} />
              <span className="font-display text-xs font-semibold">
                {tiket.toLocaleString()}
              </span>
              <span className="text-[9px] opacity-90">Ticket</span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: "#2b2b2b", color: "#ffd166" }}
            >
              <span className="text-[10px] font-semibold">Cuan</span>
              <span className="font-display text-xs font-semibold">
                {cuan.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 rounded-full"
              style={{
                background: "#111",
                color: "#ff4d4f",
                padding: "4px 10px",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff4d4f] animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider">LIVE</span>
              <span className="text-[9px] font-mono font-semibold text-white">
                {onlineCount.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <button
                className="relative rounded-full bg-[#2b2b2b] p-2"
                onClick={() => {
                  setShowNotifications((v) => !v);
                  if (unreadCount > 0) markRead.mutate();
                }}
              >
                <Bell size={18} className="text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#ff4d4f] px-0.5">
                    <span className="text-[8px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/15 bg-black/80 backdrop-blur-md shadow-lg z-40">
                  <div className="max-h-64 overflow-y-auto py-2">
                    {notifications.length === 0 && (
                      <div className="px-3 py-2 text-[10px] text-white/70">
                        No notifications.
                      </div>
                    )}
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className="px-3 py-2 text-[10px] border-b border-white/10 last:border-b-0"
                      >
                        <p className="font-semibold text-white">{n.title}</p>
                        <p className="mt-0.5 text-white/70">{n.message}</p>
                        <p className="mt-0.5 text-[9px] text-white/50">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleProfileClick}
              className="rounded-full bg-[#2b2b2b] p-2"
            >
              <Settings size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>
      {/* User row */}
      <div className="flex items-center justify-between mt-3">
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
            <p className="text-sm text-white/85">
              {isOnboarded ? "Hello," : "Welcome!"}
            </p>
            <h1 className="font-display text-lg font-bold text-white">{nickname}</h1>
            {isOnboarded ? (
              <button
                onClick={handleProfileClick}
                className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 glow-green"
              >
                <Shield size={10} className="text-primary" />
                <span className="text-[10px] font-bold text-primary glow-green-text">
                  Level {level} · Receipt Hunter
                </span>
              </button>
            ) : (
              <button
                onClick={() => requireLogin("camera")}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 glow-green shadow-[0_0_20px_hsl(147_100%_60%/0.4)] animate-pulse-glow"
              >
                <Ticket size={12} className="text-primary-foreground" />
                <span className="text-[10px] font-bold text-primary-foreground tracking-wide">UPLOAD RECEIPT → GET TICKET</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
