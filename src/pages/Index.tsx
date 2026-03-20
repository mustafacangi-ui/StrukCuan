import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Settings, ChevronRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useRadar } from "@/contexts/RadarContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useUserStats } from "@/hooks/useUserStats";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";
import { getHelloForCountry, getWelcomeForCountry } from "@/lib/greeting";

import WeeklyRewardCard from "@/components/WeeklyRewardCard";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";
import CameraScanner from "@/components/CameraScanner";


type ScannerMode = "receipt" | "red_label" | null;

const CATEGORY_ICON: Record<string, string> = {
  Market: "🛒",
  Cafe: "☕",
  Electronics: "⚡",
  Fashion: "👗",
};

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ─── Page-specific keyframes ──────────────────────────────────────────────────

const HOME_STYLES = `
  @keyframes phone-float {
    0%,100% { transform: rotateY(-20deg) rotateX(5deg) translateY(0px); }
    50%      { transform: rotateY(-18deg) rotateX(6deg) translateY(-8px); }
  }
  @keyframes scan-beam-anim {
    0%   { top: 10px; opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { top: calc(100% - 10px); opacity: 0; }
  }
  @keyframes receipt-float {
    0%,100% { transform: rotate(-2deg) translateY(0); }
    50%     { transform: rotate(-1deg) translateY(-4px); }
  }
  @keyframes coin-float {
    0%,100% { transform: translateY(0) rotate(0deg); }
    50%     { transform: translateY(-8px) rotate(10deg); }
  }
  @keyframes scan-ring-anim {
    0%,100% { opacity: 0.3; transform: scale(0.95); }
    50%     { opacity: 0.9; transform: scale(1.02); }
  }
  @keyframes avatar-ring-anim {
    0%,100% { opacity: 0.3; transform: scale(1); }
    50%     { opacity: 0.8; transform: scale(1.05); }
  }
  @keyframes fab-ring-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(155,92,255,0.6); }
    70%  { box-shadow: 0 0 0 18px rgba(155,92,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(155,92,255,0); }
  }
  @keyframes scan-cta-glow {
    0%   { box-shadow: 0 0 0 0 rgba(155,92,255,0.5); }
    70%  { box-shadow: 0 0 0 14px rgba(155,92,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(155,92,255,0); }
  }
  @keyframes grad-flow {
    0%   { background-position: 0% center; }
    50%  { background-position: 100% center; }
    100% { background-position: 0% center; }
  }
  @keyframes bar-grow-home {
    from { width: 0 !important; }
  }
  @keyframes icon-bob {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-4px); }
  }
  @keyframes home-card-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes home-shimmer {
    to { transform: translateX(300%); }
  }
  @keyframes home-top-in {
    from { opacity: 0; transform: translateY(-100%); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes live-badge-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(255,68,68,0.7); }
    70%  { box-shadow: 0 0 0 7px rgba(255,68,68,0); }
    100% { box-shadow: 0 0 0 0 rgba(255,68,68,0); }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhoneHero() {
  return (
    <div
      className="absolute right-0 top-0 pointer-events-none"
      style={{ width: "165px", height: "225px", perspective: "600px" }}
      aria-hidden
    >
      {/* Phone shell */}
      <div
        className="w-full h-full relative"
        style={{
          animation: "phone-float 4s ease-in-out infinite",
          filter: "drop-shadow(0 20px 40px rgba(155,92,255,0.32))",
        }}
      >
        <div
          className="w-full h-full rounded-3xl relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg,#1e1540,#130e30,#0d0920)",
            border: "1.5px solid rgba(155,92,255,0.35)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 0 50px rgba(155,92,255,0.15)",
          }}
        >
          {/* Screen */}
          <div
            className="absolute rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              inset: "9%",
              background: "linear-gradient(180deg,#160d30,#0d0920)",
            }}
          >
            {/* Screen glow */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 50% 30%,rgba(155,92,255,0.18),transparent 60%)",
              }}
            />
            {/* Scan ring */}
            <div
              className="absolute inset-2 rounded-xl"
              style={{
                border: "1.5px solid rgba(155,92,255,0.5)",
                animation: "scan-ring-anim 2s ease-in-out infinite",
              }}
            />
            {/* Corner brackets */}
            {[
              { t: "8px", l: "8px", bt: "2px solid #9b5cff", bl: "2px solid #9b5cff", br: "3px 0 0 0" },
              { t: "8px", r: "8px", bt: "2px solid #9b5cff", brr: "2px solid #9b5cff", br: "0 3px 0 0" },
              { b: "8px", l: "8px", bb: "2px solid #ff4ecd", bl: "2px solid #ff4ecd", br: "0 0 0 3px" },
              { b: "8px", r: "8px", bb: "2px solid #ff4ecd", brr: "2px solid #ff4ecd", br: "0 0 3px 0" },
            ].map((c, i) => (
              <div
                key={i}
                className="absolute w-3 h-3"
                style={{
                  top: c.t,
                  left: c.l,
                  bottom: c.b,
                  right: c.r,
                  borderTop: c.bt,
                  borderLeft: c.bl,
                  borderBottom: c.bb,
                  borderRight: c.brr,
                  borderRadius: c.br,
                }}
              />
            ))}
            {/* Scan beam */}
            <div
              className="absolute left-1 right-1 h-[1.5px]"
              style={{
                background: "linear-gradient(90deg,transparent,#9b5cff,#ff4ecd,transparent)",
                boxShadow: "0 0 8px #9b5cff",
                animation: "scan-beam-anim 2s ease-in-out infinite",
              }}
            />
            {/* Receipt card */}
            <div
              className="relative z-10 bg-white rounded-md p-1.5"
              style={{
                width: "75%",
                fontSize: "5px",
                color: "#333",
                boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                animation: "receipt-float 3s ease-in-out infinite",
                transform: "rotate(-2deg)",
              }}
            >
              <div
                className="text-center font-bold text-white rounded-sm mb-1 py-0.5"
                style={{
                  fontSize: "7px",
                  background: "linear-gradient(90deg,#ff3333,#ff6666)",
                }}
              >
                RECEIPT -50%
              </div>
              {[
                ["Item A", "Rp 5.000", false],
                ["Item B", "Rp 8.000", false],
                ["Diskon", "-Rp 6.500", true],
                ["Total", "Rp 6.500", false, true],
              ].map(([k, v, isRed, isBold], i) => (
                <div
                  key={i}
                  className="flex justify-between py-[1.5px]"
                  style={{
                    fontSize: "4px",
                    borderBottom: "1px dashed #eee",
                    fontWeight: isBold ? "700" : "400",
                    color: isRed ? "#f00" : isBold ? "#000" : "#666",
                  }}
                >
                  <span>{k as string}</span>
                  <span>{v as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating coins */}
      {[
        { top: "5%", right: "0%", dur: "2.8s", del: "0s" },
        { top: "32%", left: "-12px", dur: "3.5s", del: "0.5s" },
        { bottom: "15%", right: "-4px", dur: "2.5s", del: "1s" },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
          style={{
            top: c.top,
            left: c.left,
            bottom: c.bottom,
            right: c.right,
            background: "linear-gradient(135deg,#ffd600,#ffab00)",
            border: "2px solid rgba(255,214,0,0.6)",
            boxShadow: "0 0 12px rgba(255,214,0,0.4)",
            animation: `coin-float ${c.dur} ease-in-out ${c.del} infinite`,
          }}
        >
          🪙
        </div>
      ))}
    </div>
  );
}

function StepCard({
  icon,
  title,
  sub,
  delay,
}: {
  icon: string;
  title: string;
  sub: string;
  delay: string;
}) {
  return (
    <div
      className="rounded-2xl p-3.5 text-center relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(155,92,255,0.15)",
        animation: `home-card-in 0.4s ${delay} ease both`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 0%,rgba(155,92,255,0.07),transparent 70%)",
        }}
      />
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl mx-auto mb-2 relative z-10"
        style={{
          background: "rgba(155,92,255,0.12)",
          border: "1px solid rgba(155,92,255,0.28)",
          animation: "icon-bob 2.5s ease-in-out infinite",
        }}
      >
        {icon}
      </div>
      <p
        className="text-[11px] font-bold text-white mb-0.5 relative z-10"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {title}
      </p>
      <p className="text-[9px] leading-[1.4] relative z-10" style={{ color: "rgba(255,255,255,0.45)" }}>
        {sub}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, isOnboarded, requireLogin } = useUser();
  const { deals } = useRadar();
  const { data: ticketCount = 0 } = useUserTickets(user?.id);
  const { data: stats } = useUserStats(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);
  const markRead = useMarkNotificationsRead(user?.id);
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [onlineCount, setOnlineCount] = useState(341);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const progressPercent = Math.min(100, (ticketCount / MAX_TICKETS_PER_WEEK) * 100);

  const nickname =
    user?.nickname ??
    session?.user?.user_metadata?.full_name ??
    session?.user?.user_metadata?.name ??
    session?.user?.user_metadata?.display_name ??
    session?.user?.email ??
    "Guest";
  const level = stats?.level ?? user?.level ?? 1;

  // Live online count flicker
  useEffect(() => {
    const id = setInterval(() => {
      setOnlineCount((p) => Math.max(280, Math.min(420, p + Math.floor(Math.random() * 7) - 3)));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Deep-link navigation state
  useEffect(() => {
    const state = location.state as { requireLogin?: "camera" | "profile"; openCamera?: boolean } | null;
    if (state?.requireLogin) {
      requireLogin(state.requireLogin);
      navigate("/home", { replace: true });
    }
    if (state?.openCamera) {
      setScannerMode("receipt");
      navigate("/home", { replace: true, state: {} });
    }
  }, [location.state, requireLogin, navigate]);

  const handleScanReceipt = () => {
    if (!isOnboarded) { requireLogin("camera"); return; }
    setScannerMode("receipt");
  };

  const handleScanRedLabel = () => {
    if (!isOnboarded) { requireLogin("camera"); return; }
    setScannerMode("red_label");
  };

  const handleProfileClick = () => {
    if (!isOnboarded) requireLogin("profile");
    else navigate("/settings");
  };

  const greeting = isOnboarded
    ? getHelloForCountry(user?.countryCode)
    : getWelcomeForCountry(user?.countryCode);

  // Top 3 closest deals
  const nearbyDeals = [...deals].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);

  return (
    <>
      {/* Page-specific keyframes injected once */}
      <style>{HOME_STYLES}</style>

      <div
        className="min-h-screen pb-28 w-full max-w-[430px] mx-auto relative"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Background ── */}
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(ellipse 90% 55% at 50% -5%, rgba(155,92,255,0.16) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 10% 65%, rgba(100,40,200,0.1) 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 90% 85%, rgba(255,78,205,0.07) 0%, transparent 50%),
              linear-gradient(180deg,#0c0920 0%,#0e0b1e 50%,#090714 100%)
            `,
          }}
        />

        {/* ── Sticky Topbar ── */}
        <header
          className="sticky top-0 z-50 flex items-center gap-2.5 px-4 py-3"
          style={{
            background: "rgba(10,8,26,0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(155,92,255,0.12)",
            animation: "home-top-in 0.5s ease both",
          }}
        >
          {/* Red Tickets pill */}
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-2 relative overflow-hidden cursor-pointer"
            onClick={() => navigate("/cuan")}
            style={{
              background: "rgba(255,68,68,0.12)",
              border: "1px solid rgba(255,68,68,0.28)",
            }}
          >
            <span
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,100,100,0.1),transparent)",
                transform: "translateX(-100%)",
                animation: "home-shimmer 2.5s ease infinite",
              }}
            />
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
              <rect x="1" y="4" width="18" height="12" rx="2" stroke="#ff7070" strokeWidth="1.5" />
              <path d="M6 4v12M14 4v12" stroke="#ff7070" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="10" cy="10" r="2" fill="#ff7070" />
            </svg>
            <span
              className="font-bold text-[13px] text-[#ff7070] relative z-10"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {ticketCount} Tickets
            </span>
          </div>

          {/* LIVE pill */}
          <div
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2"
            style={{
              background: "rgba(255,68,68,0.1)",
              border: "1px solid rgba(255,68,68,0.22)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#ff4444",
                boxShadow: "0 0 6px #ff4444",
                animation: "live-badge-pulse 1.2s ease infinite",
                display: "inline-block",
              }}
            />
            <span className="text-[11px] font-bold text-[#ff7070] whitespace-nowrap">
              LIVE {onlineCount}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notification bell */}
            <div className="relative">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(155,92,255,0.08)",
                  border: "1px solid rgba(155,92,255,0.18)",
                  color: "rgba(255,255,255,0.65)",
                }}
                onClick={() => {
                  setShowNotifs((v) => !v);
                  if (unreadCount > 0) markRead.mutate();
                }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#ff4444]" style={{ border: "1.5px solid #0e0b1e" }} />
                )}
              </button>
              {showNotifs && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl z-50 overflow-hidden"
                  style={{
                    background: "rgba(20,16,42,0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(155,92,255,0.18)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="max-h-60 overflow-y-auto py-2">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-3 text-[11px] text-white/50">No notifications.</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: "rgba(155,92,255,0.1)" }}>
                          <p className="font-semibold text-white text-[11px]">{n.title}</p>
                          <p className="text-white/60 text-[10px] mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:rotate-45"
              style={{
                background: "rgba(155,92,255,0.08)",
                border: "1px solid rgba(155,92,255,0.18)",
                color: "rgba(255,255,255,0.65)",
                transitionDuration: "0.3s",
              }}
              onClick={handleProfileClick}
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* ── User Header ── */}
        <div
          className="px-4 pt-5 pb-0 flex items-center justify-between"
          style={{ animation: "home-card-in 0.5s 0.1s ease both" }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative" onClick={handleProfileClick} style={{ cursor: "pointer" }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg,#2a1a5e,#1a1040)",
                  border: "2px solid rgba(155,92,255,0.5)",
                  boxShadow: "0 0 20px rgba(155,92,255,0.2)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#9b5cff",
                }}
              >
                {nickname[0]?.toUpperCase() ?? "?"}
              </div>
              {/* Animated ring */}
              <div
                className="absolute pointer-events-none rounded-full"
                style={{
                  inset: "-4px",
                  border: "1.5px solid rgba(155,92,255,0.3)",
                  animation: "avatar-ring-anim 2s ease-in-out infinite",
                }}
              />
              {/* Level badge */}
              <div
                className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-extrabold"
                style={{
                  background: "linear-gradient(135deg,#ffd600,#ffab00)",
                  border: "2px solid #0e0b1e",
                  color: "#1a0a00",
                }}
              >
                {level}
              </div>
            </div>

            {/* User text */}
            <div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {greeting}
              </p>
              <p
                className="text-[17px] font-extrabold text-white tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.3px" }}
              >
                {nickname}
              </p>
              {isOnboarded && (
                <div
                  className="inline-flex items-center gap-1.5 mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: "rgba(155,92,255,0.1)",
                    border: "1px solid rgba(155,92,255,0.25)",
                    color: "#9b5cff",
                  }}
                >
                  <span>⊙</span>
                  Level {level} · Receipt Hunter
                </div>
              )}
            </div>
          </div>

          {/* Camera FAB */}
          <button
            onClick={handleScanReceipt}
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl shrink-0 transition-transform hover:scale-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#9b5cff,#ff4ecd)",
              animation: "fab-ring-pulse 2.5s ease infinite",
              boxShadow: "0 0 0 0 rgba(155,92,255,0.5)",
            }}
            aria-label="Scan"
          >
            📷
          </button>
        </div>

        {/* ── Hero ── */}
        <section
          className="px-4 pt-5 relative"
          style={{
            minHeight: "230px",
            animation: "home-card-in 0.5s 0.15s ease both",
          }}
        >
          {/* Text column */}
          <div style={{ maxWidth: "215px" }}>
            {/* Live Deal Radar label */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: "#9b5cff",
                  boxShadow: "0 0 8px #9b5cff",
                  animation: "live-dot 1.4s ease infinite",
                  display: "inline-block",
                }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "#9b5cff" }}
              >
                Live Deal Radar
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold leading-[1.1] text-white mb-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "33px",
                letterSpacing: "-0.5px",
              }}
            >
              Scan Deals &{" "}
              <span
                className="block"
                style={{
                  background: "linear-gradient(90deg,#9b5cff,#ff4ecd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 20px rgba(155,92,255,0.4))",
                }}
              >
                Earn Rewards
              </span>
            </h1>

            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)", maxWidth: "200px" }}
            >
              Capture receipts and red-label discounts to earn tickets for the weekly draw.
            </p>
          </div>

          {/* 3D phone — absolutely positioned right */}
          <PhoneHero />
        </section>

        {/* ── Progress Card ── */}
        <div
          className="mx-4 mt-5 rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "#1a1535",
            border: "1px solid rgba(155,92,255,0.18)",
            animation: "home-card-in 0.5s 0.2s ease both",
          }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: "-30px",
              right: "-30px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(155,92,255,0.1),transparent 70%)",
            }}
          />
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="text-[13px] font-bold text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Your Progress
            </span>
            <span
              className="text-[13px] font-bold text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {ticketCount} / {MAX_TICKETS_PER_WEEK} tickets
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full relative"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg,#7c3aed,#9b5cff,#ff4ecd)",
                animation: "bar-grow-home 1.5s 0.5s ease both",
              }}
            >
              <span
                className="absolute right-0 top-0 bottom-0 w-[3px] rounded-full bg-white"
                style={{ opacity: 0.8, animation: "prog-cursor 0.8s ease-in-out infinite alternate" }}
              />
            </div>
          </div>
        </div>

        {/* ── Scan CTA ── */}
        <div
          className="px-4 mt-4"
          style={{ animation: "home-card-in 0.5s 0.22s ease both" }}
        >
          <button
            onClick={handleScanReceipt}
            className="w-full py-4 rounded-2xl relative overflow-hidden flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] hover:scale-[1.01]"
            style={{
              background: "linear-gradient(90deg,#6b21d6,#9b5cff,#ff4ecd)",
              backgroundSize: "200% 100%",
              animation: "scan-cta-glow 2.5s ease infinite, grad-flow 4s ease infinite",
              border: "none",
            }}
          >
            {/* Shimmer */}
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
                transform: "translateX(-100%)",
                animation: "home-shimmer 2.5s ease infinite",
              }}
            />
            <span className="text-xl relative z-10" style={{ animation: "icon-bob 1.5s ease-in-out infinite" }}>
              ⊡
            </span>
            <span
              className="font-extrabold text-[16px] text-white relative z-10"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Scan Now
            </span>
          </button>

          {/* Sub-label */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{
                background: "#ffd600",
                boxShadow: "0 0 6px #ffd600",
                display: "inline-block",
              }}
            />
            <span className="text-[11px] font-semibold" style={{ color: "#ffd600" }}>
              Bagikan struk label merah &amp; dapatkan 3 tiket!
            </span>
          </div>
        </div>

        {/* ── How it works ── */}
        <div
          className="px-4 mt-5"
          style={{ animation: "home-card-in 0.5s 0.24s ease both" }}
        >
          <div className="grid grid-cols-3 gap-2.5">
            <StepCard icon="🧾" title="Scan Struk" sub="Upload struk belanja untuk tiket" delay="0.4s" />
            <StepCard icon="🎫" title="Kumpulkan" sub="Dapatkan tiket ke undian mingguan" delay="0.48s" />
            <StepCard icon="🛒" title="Menangkan" sub="Voucher belanja menarik!" delay="0.56s" />
          </div>
        </div>

        {/* ── Nearby Deals ── */}
        <section
          className="px-4 mt-5"
          style={{ animation: "home-card-in 0.5s 0.26s ease both" }}
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span
                className="w-[3px] h-[18px] rounded-full block"
                style={{ background: "linear-gradient(180deg,#9b5cff,#ff4ecd)" }}
              />
              <h2
                className="text-[13px] font-extrabold uppercase tracking-[0.1em]"
                style={{ color: "rgba(255,255,255,0.22)", fontFamily: "'Syne', sans-serif" }}
              >
                Nearby Deals
              </h2>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-[12px] font-semibold transition-all hover:gap-2"
              style={{ color: "#9b5cff" }}
            >
              View Map <ChevronRight size={13} />
            </button>
          </div>

          {nearbyDeals.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No deals nearby yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {nearbyDeals.map((deal, i) => {
                const icon = CATEGORY_ICON[deal.category] ?? "🏪";
                const isRed = deal.isRedLabel;
                return (
                  <button
                    key={deal.id}
                    onClick={() => navigate("/")}
                    className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left relative overflow-hidden transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(255,255,255,0.045)",
                      border: isRed ? "1px solid rgba(255,68,68,0.25)" : "1px solid rgba(155,92,255,0.12)",
                      animation: `home-card-in 0.4s ${0.4 + i * 0.08}s ease both`,
                    }}
                    onPointerEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(155,92,255,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(155,92,255,0.28)";
                    }}
                    onPointerLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.045)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = isRed ? "rgba(255,68,68,0.25)" : "rgba(155,92,255,0.12)";
                    }}
                  >
                    {/* Left gradient accent */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg,rgba(155,92,255,0.04),transparent 40%)",
                      }}
                    />
                    <div
                      className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-[18px] shrink-0 transition-transform"
                      style={{
                        background: "linear-gradient(135deg,#1e1540,#13102a)",
                        border: "1px solid rgba(155,92,255,0.2)",
                      }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-bold text-white mb-0.5"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        {deal.store ?? "Store"}
                      </p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {formatDist(deal.distanceKm)} · {deal.category}
                      </p>
                    </div>
                    {deal.discount != null ? (
                      <div
                        className="rounded-xl px-3 py-1.5 shrink-0 transition-transform"
                        style={{
                          background: "rgba(255,68,68,0.15)",
                          border: "1px solid rgba(255,68,68,0.3)",
                        }}
                      >
                        <span
                          className="font-extrabold text-[12px] text-[#ff7070]"
                          style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                          −{deal.discount}%
                        </span>
                      </div>
                    ) : isRed ? (
                      <span
                        className="shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-bold"
                        style={{
                          background: "rgba(255,68,68,0.12)",
                          border: "1.5px dashed rgba(255,68,68,0.38)",
                          color: "#ff7070",
                          textShadow: "0 0 6px rgba(255,68,68,0.6)",
                        }}
                      >
                        Red Label
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Red Label Banner ── */}
        <button
          onClick={handleScanRedLabel}
          className="mx-4 mt-5 w-[calc(100%-32px)] flex items-center gap-3.5 rounded-2xl p-4 text-left relative overflow-hidden transition-all active:scale-[0.98] hover:scale-[1.01]"
          style={{
            background: "linear-gradient(135deg,rgba(255,68,68,0.1),rgba(155,30,30,0.06))",
            border: "1px solid rgba(255,68,68,0.22)",
            animation: "home-card-in 0.5s 0.28s ease both",
          }}
          onPointerEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,68,68,0.42)";
          }}
          onPointerLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,68,68,0.22)";
          }}
        >
          {/* Shimmer */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(90deg,transparent,rgba(255,68,68,0.05),transparent)",
              transform: "translateX(-100%)",
              animation: "home-shimmer 3s ease infinite",
            }}
          />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: "rgba(255,68,68,0.12)",
              border: "1px solid rgba(255,68,68,0.28)",
              animation: "icon-bob 2.5s ease-in-out infinite",
            }}
          >
            🏷️
          </div>
          <div className="relative z-10">
            <p
              className="text-[14px] font-extrabold text-white mb-0.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Share Struk Label Merah
            </p>
            <p className="text-[11px] leading-snug mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Upload struk diskon label merah untuk mendapatkan 3 tiket bonus!
            </p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold"
              style={{
                background: "rgba(255,214,0,0.12)",
                border: "1px solid rgba(255,214,0,0.28)",
                color: "#ffd600",
              }}
            >
              🪙 +3 Tiket Bonus
            </span>
          </div>
        </button>

        {/* ── Weekly Reward section header ── */}
        <div className="px-4 mt-5 mb-0">
          <div className="flex items-center gap-2">
            <span
              className="w-[3px] h-[18px] rounded-full block"
              style={{ background: "linear-gradient(180deg,#9b5cff,#ff4ecd)" }}
            />
            <h2
              className="text-[13px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: "rgba(255,255,255,0.22)", fontFamily: "'Syne', sans-serif" }}
            >
              Weekly Reward
            </h2>
          </div>
        </div>

        {/* ── Weekly Reward Card ── */}
        <section className="px-4 mt-3" style={{ animation: "home-card-in 0.5s 0.3s ease both" }}>
          <WeeklyRewardCard />
        </section>

        <LegalFooter />
        <LoginSheet />
        <BottomNav />

        {scannerMode && (
          <CameraScanner mode={scannerMode} onClose={() => setScannerMode(null)} />
        )}
      </div>
    </>
  );
};

export default Index;
