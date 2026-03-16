import { Bell, Camera, Receipt, MapPin, Settings, Shield, Ticket, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";

interface HeaderProps {
  onUploadReceipt?: () => void;
  onShareDiscount?: () => void;
}

const Header = ({ onUploadReceipt, onShareDiscount }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, session, isOnboarded, isLoading, requireLogin } = useUser();

  const { data: stats } = useUserStats(user?.id);
  const { data: weeklyTickets } = useUserTickets(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markRead = useMarkNotificationsRead(user?.id);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  /** Ticket count from user_tickets only - never fall back to user_stats (avoids stale data after weekly draw reset) */
  const tiket = weeklyTickets ?? 0;
  const nickname =
    user?.nickname ??
    session?.user?.user_metadata?.full_name ??
    session?.user?.user_metadata?.name ??
    session?.user?.user_metadata?.display_name ??
    session?.user?.email ??
    "Guest";
  const level = stats?.level ?? user?.level ?? 1;

  const handleProfileClick = () => {
    if (!isOnboarded) {
      requireLogin("profile");
    } else {
      navigate("/settings");
    }
  };

  const handleUploadReceipt = () => {
    setShowCameraMenu(false);
    onUploadReceipt?.();
  };

  const handleShareDiscount = () => {
    setShowCameraMenu(false);
    onShareDiscount?.();
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
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => isOnboarded && navigate("/cuan")}
            className="flex items-center gap-2"
          >
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: "rgba(0,0,0,0.4)", color: "#facc15" }}
            >
              <Ticket size={14} />
              <span className="font-display text-xs font-semibold">
                {tiket.toLocaleString()}
              </span>
              <span className="text-[9px] opacity-90">Bilet</span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: "rgba(0,0,0,0.4)", color: "#22c55e" }}
            >
              <span className="text-[10px] font-semibold">Cuan</span>
              <span className="font-display text-xs font-semibold">
                {cuan.toLocaleString()}
              </span>
            </div>
          </button>
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
      {/* User row: Welcome + name on left, camera button on right */}
      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleProfileClick}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary glow-green"
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
          <div className="min-w-0">
            <p className="text-sm text-white/85">
              {isOnboarded ? "Hello," : "Welcome"}
            </p>
            <h1 className="font-display text-lg font-bold text-white truncate">{nickname}</h1>
            {isOnboarded && (
              <button
                onClick={handleProfileClick}
                className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 glow-green"
              >
                <Shield size={10} className="text-primary" />
                <span className="text-[10px] font-bold text-primary glow-green-text">
                  Level {level} · Receipt Hunter
                </span>
              </button>
            )}
          </div>
        </div>
        <Popover
          open={showCameraMenu}
          onOpenChange={(open) => {
            if (open && !isOnboarded) {
              // Localhost: requireLogin → signInAnonymously arka planda, kamerayı aç; ASLA dış linke yönlendirme
              requireLogin("camera");
              setShowCameraMenu(false);
              return;
            }
            setShowCameraMenu(open);
          }}
        >
          <PopoverTrigger asChild>
            <button
              onClick={() => setRippleKey((k) => k + 1)}
              className="relative shrink-0 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-green-500 shadow-lg transition-all duration-200 ease-in-out hover:scale-105 hover:bg-green-600 active:scale-95"
              aria-label="Kamera menüsü"
            >
              <span
                key={rippleKey}
                className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 animate-ripple"
              />
              <Camera size={24} className="relative z-10 text-white flex-shrink-0" strokeWidth={2} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-56 p-2">
            <button
              onClick={handleUploadReceipt}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
            >
              <Receipt size={18} className="text-green-500" />
              <div>
                <p className="font-semibold text-foreground">Fiş Yükle</p>
                <p className="text-[10px] text-muted-foreground">+1 Bilet</p>
              </div>
            </button>
            <button
              onClick={handleShareDiscount}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
            >
              <MapPin size={18} className="text-red-500" />
              <div>
                <p className="font-semibold text-foreground">İndirim Paylaş</p>
                <p className="text-[10px] text-muted-foreground">+2 Bilet · Haritada görünür</p>
              </div>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default Header;
