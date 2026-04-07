import { Bell, Camera, Receipt, MapPin, Settings, Shield, Ticket, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { getHelloForCountry, getWelcomeForCountry } from "@/lib/greeting";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";

interface HeaderProps {
  onUploadReceipt?: () => void;
  onShareDiscount?: () => void;
  /** Hide the Cuan metric badge (e.g. on the focused Home screen) */
  hideCuan?: boolean;
}

const Header = ({ onUploadReceipt, onShareDiscount, hideCuan = false }: HeaderProps) => {
  const { t } = useTranslation();
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

  useEffect(() => {
    // Background tracking continues via UserContext/last_seen logic
  }, []);

  const cuan = stats?.cuan ?? 0;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="rounded-2xl p-4 bg-white/25 backdrop-blur-xl border border-white/35 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => isOnboarded && navigate("/cuan")}
            className="flex items-center gap-3"
          >
            {/* Ticket badge — red premium style when hideCuan, standard emerald otherwise */}
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 min-w-[88px]"
              style={hideCuan ? {
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.22)",
                boxShadow: "0 0 14px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
              } : {
                background: "rgba(255,255,255,0.3)",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              <Ticket
                size={16}
                style={hideCuan
                  ? { color: "#ef4444", filter: "drop-shadow(0 0 4px rgba(239,68,68,0.65))" }
                  : undefined}
                className={hideCuan ? "" : "text-emerald-600"}
              />
              <div className="text-left">
                <p className={`font-display text-sm font-bold ${hideCuan ? "text-white" : "text-slate-800"}`}>
                  {tiket.toLocaleString()}
                </p>
                <p
                  className={`text-[9px] ${hideCuan ? "" : "text-slate-600"}`}
                  style={hideCuan ? { color: "rgba(239,68,68,0.65)" } : undefined}
                >
                  Bilet
                </p>
              </div>
            </div>

            {/* Cuan badge — hidden when hideCuan=true */}
            {!hideCuan && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white/30 border border-white/40 min-w-[88px]">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-left">
                  <p className="font-display text-sm font-bold text-emerald-700">{cuan.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-600">Cuan</p>
                </div>
              </div>
            )}
          </button>
          <div className="flex items-center gap-2">

            <div className="relative">
            <button
              className="relative rounded-xl bg-white/30 border border-white/40 p-2"
                onClick={() => {
                  setShowNotifications((v) => !v);
                  if (unreadCount > 0) markRead.mutate();
                }}
              >
                <Bell size={18} className="text-slate-800" />
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
              className="rounded-xl bg-white/30 border border-white/40 p-2"
            >
              <Settings size={18} className="text-slate-800" />
            </button>
          </div>
        </div>
      </div>
      {/* User row: Welcome + name on left, camera button on right */}
      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleProfileClick}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-white/30 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
          >
            {isOnboarded ? (
              <span className="font-display text-lg font-bold text-emerald-700">
                {nickname[0]?.toUpperCase()}
              </span>
            ) : (
              <User size={20} className="text-emerald-600" />
            )}
            {isOnboarded && (
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <span className="text-[8px] font-bold text-white">{level}</span>
              </div>
            )}
          </button>
          <div className="min-w-0">
            <p className="text-sm text-slate-700">
              {isOnboarded ? getHelloForCountry(user?.countryCode) : getWelcomeForCountry(user?.countryCode)}
            </p>
            <h1 className="font-display text-lg font-bold text-slate-800 truncate">{nickname}</h1>
            {isOnboarded && (
              <button
                onClick={handleProfileClick}
                className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5"
              >
                <Shield size={10} className="text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700 glow-green-text">
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
              className="relative shrink-0 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-green-500 shadow-[0_0_24px_rgba(34,197,94,0.5)] transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-[0_0_32px_rgba(34,197,94,0.6)] active:scale-95"
              aria-label="Kamera menüsü"
            >
              <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-radar-sweep" />
              <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-radar-sweep-delayed" />
              <span
                key={rippleKey}
                className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 animate-ripple"
              />
              <Camera size={26} className="relative z-10 text-white flex-shrink-0" strokeWidth={2.5} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-56 p-2">
            <button
              onClick={handleUploadReceipt}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
            >
              <Receipt size={18} className="text-emerald-600" />
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
