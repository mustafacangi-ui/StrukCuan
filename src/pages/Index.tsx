import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Settings, ChevronRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useRadar } from "@/contexts/RadarContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useUserStats } from "@/hooks/useUserStats";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";
import { getHelloForCountry, getWelcomeForCountry } from "@/lib/greeting";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

// ── Always-visible chrome (keep eager) ───────────────────────────────────────
import BottomNav from "@/components/BottomNav";
import LanguageSelector from "@/components/LanguageSelector";

// ── Lazy-loaded: only downloaded when actually needed ────────────────────────
// CameraScanner: ~60 KB chunk — only when user taps Scan
const CameraScanner   = lazy(() => import("@/components/CameraScanner"));
// WeeklyRewardCard: below the fold, deferred until visible
const WeeklyRewardCard = lazy(() => import("@/components/WeeklyRewardCard"));
// LoginSheet + LegalFooter: rarely/never needed on first paint
const LoginSheet      = lazy(() => import("@/components/LoginSheet"));
const LegalFooter     = lazy(() => import("@/components/LegalFooter"));


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
  @keyframes scan-btn-breathe {
    0%,100% {
      box-shadow:
        0 0 0 0   rgba(155,92,255,0.55),
        0 0 30px  rgba(155,92,255,0.3),
        0 0 60px  rgba(255,78,205,0.12),
        0 8px 24px rgba(0,0,0,0.45);
    }
    50% {
      box-shadow:
        0 0 0 20px rgba(155,92,255,0),
        0 0 55px  rgba(155,92,255,0.55),
        0 0 110px rgba(255,78,205,0.22),
        0 8px 28px rgba(0,0,0,0.5);
    }
  }
  @keyframes rl-glow-pulse {
    0%,100% {
      box-shadow: 0 0 0 0 rgba(255,68,68,0.4), 0 4px 20px rgba(255,68,68,0.1);
    }
    50% {
      box-shadow: 0 0 0 12px rgba(255,68,68,0), 0 4px 44px rgba(255,68,68,0.28);
    }
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

// StepCard removed — non-functional decorative cards eliminated for clarity

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
  // Defer the complex 3-D phone decoration so React can paint the LCP hero
  // text first, then add non-critical animations in the next frame.
  const [showPhone, setShowPhone] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  // Entry computation (10 tickets = 1 entry) — used in user header inline progress

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

  // Defer 3D phone so the LCP hero text paints first
  useEffect(() => {
    const t = requestAnimationFrame(() => setShowPhone(true));
    return () => cancelAnimationFrame(t);
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

  // All scan buttons open the scanner on the type-selection screen first
  const handleOpenScanner = () => {
    if (!isOnboarded) { requireLogin("camera"); return; }
    setScannerMode("receipt"); // any truthy value — actual type chosen inside scanner
  };

  // Keep these as aliases so existing call sites compile without change
  const handleScanReceipt  = handleOpenScanner;
  const handleScanRedLabel = handleOpenScanner;

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
        {/* ── Background — shared Deep Navy Premium ── */}
        <div
          className="fixed inset-0 -z-10"
          style={{ background: PREMIUM_PAGE_BACKGROUND }}
        />

        {/* ── Sticky Topbar ── */}
        <header
          className="sticky top-0 z-50 flex items-center gap-2.5 px-4 py-3"
          style={{
            background: "rgba(10,14,26,0.85)",
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
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#ff4444]" style={{ border: "1.5px solid #0A0E1A" }} />
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

            {/* Language switcher */}
            <LanguageSelector variant="compact" />

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
                  border: "2px solid #0A0E1A",
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

              {/* ── Inline weekly progress: entry view ── */}
              {(() => {
                const _entries   = Math.floor(ticketCount / 10);
                const _remaining = ticketCount % 10;
                const _needed    = 10 - _remaining;
                return (
                  <div className="mt-2" style={{ width: "155px" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="text-[10px] font-extrabold tabular-nums"
                        style={{ color: "#ffd600", textShadow: "0 0 8px rgba(255,214,0,0.55)" }}
                      >
                        {_entries}
                      </span>
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.38)" }}>
                        {_entries === 1 ? "entry" : "entries"}
                      </span>
                      <span className="text-[9px] ml-auto tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {_remaining}/10 → next
                      </span>
                    </div>
                    <div
                      className="h-[5px] rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(_remaining / 10) * 100}%`,
                          background: "linear-gradient(90deg,#00E676,#00c853)",
                          boxShadow: "0 0 6px rgba(0,230,118,0.5)",
                          animation: "bar-grow-home 1.5s 0.6s ease both",
                        }}
                      />
                    </div>
                    <p className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                      {ticketCount} tickets · {_needed} more for next entry
                    </p>
                  </div>
                );
              })()}
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

            {/* Headline — 3-line hierarchy */}
            <h1
              className="font-extrabold leading-[1.12] mb-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "28px",
                letterSpacing: "-0.4px",
              }}
            >
              <span className="text-white block">Scan Receipts</span>
              <span className="text-white block">Find Red Labels</span>
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
              className="mt-3 text-[13px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.68)", maxWidth: "210px" }}
            >
              Earn tickets and get access to weekly rewards.
            </p>
          </div>

          {/* 3D phone — deferred so LCP hero text paints first */}
          {showPhone && <PhoneHero />}
        </section>

        {/* ── Scan CTA ── */}
        <div
          className="px-4 mt-4"
          style={{ animation: "home-card-in 0.5s 0.22s ease both" }}
        >
          <button
            onClick={handleScanReceipt}
            className="w-full py-[18px] rounded-2xl relative overflow-hidden flex items-center justify-center gap-3 transition-transform active:scale-[0.97] hover:scale-[1.01]"
            style={{
              background: "linear-gradient(90deg,#6b21d6,#9b5cff,#ff4ecd)",
              backgroundSize: "200% 100%",
              border: "1px solid rgba(255,255,255,0.12)",
              animation: "scan-btn-breathe 2.5s ease-in-out infinite, grad-flow 4s ease infinite",
            }}
          >
            {/* Moving scan-line beam */}
            <span
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              aria-hidden
            >
              <span
                className="absolute top-0 bottom-0 w-[30%]"
                style={{
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)",
                  animation: "home-shimmer 1.8s ease-in-out infinite",
                }}
              />
            </span>
            {/* Inner top highlight */}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)" }}
              aria-hidden
            />
            <span
              className="text-[22px] relative z-10"
              style={{ animation: "icon-bob 1.5s ease-in-out infinite" }}
            >
              📷
            </span>
            <span
              className="font-extrabold text-[17px] text-white relative z-10 tracking-wide"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Scan Now
            </span>
          </button>

          {/* ── Value message: what you earn ── */}
          <div
            className="mt-3 rounded-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="text-[15px]">📸</span>
              <span className="text-[12px] text-white/65 flex-1">Scan receipt</span>
              <span
                className="font-bold text-[13px] tabular-nums"
                style={{ color: "#00E676", textShadow: "0 0 10px rgba(0,230,118,0.55)" }}
              >
                +1 ticket
              </span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="text-[15px]">🔴</span>
              <span className="text-[12px] text-white/65 flex-1">Scan red label</span>
              <span
                className="font-extrabold text-[13px] tabular-nums"
                style={{ color: "#00E676", textShadow: "0 0 12px rgba(0,230,118,0.65)" }}
              >
                +3 tickets
              </span>
            </div>
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
              onClick={() => navigate("/radar")}
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
                    onClick={() => navigate("/radar")}
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

        {/* ── Red Label Banner ── HIGH VALUE ACTION ── */}
        <button
          onClick={handleScanRedLabel}
          className="mx-4 mt-5 w-[calc(100%-32px)] flex items-center gap-4 rounded-2xl p-5 text-left relative overflow-hidden transition-all active:scale-[0.98] hover:scale-[1.01]"
          style={{
            background: "linear-gradient(135deg,rgba(255,68,68,0.13),rgba(180,20,20,0.07))",
            border: "1px solid rgba(255,68,68,0.3)",
            animation: "home-card-in 0.5s 0.28s ease both, rl-glow-pulse 2.8s ease-in-out 1s infinite",
          }}
        >
          {/* Shimmer sweep */}
          <span
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            aria-hidden
          >
            <span
              className="absolute top-0 bottom-0 w-[35%]"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,68,68,0.08),transparent)",
                animation: "home-shimmer 3s ease-in-out 1.2s infinite",
              }}
            />
          </span>
          {/* Top highlight edge */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,100,100,0.4),transparent)" }}
            aria-hidden
          />

          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-[28px] shrink-0"
            style={{
              background: "rgba(255,68,68,0.14)",
              border: "1px solid rgba(255,68,68,0.32)",
              boxShadow: "0 0 18px rgba(255,68,68,0.15)",
              animation: "icon-bob 2.5s ease-in-out infinite",
            }}
          >
            🏷️
          </div>
          <div className="relative z-10 flex-1 min-w-0">
            <p
              className="text-[15px] font-extrabold text-white mb-1 leading-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Share Struk Label Merah
            </p>
            <p className="text-[11.5px] leading-snug mb-2.5" style={{ color: "rgba(255,255,255,0.52)" }}>
              Upload struk diskon label merah untuk mendapatkan 3 tiket bonus!
            </p>
            {/* Reward badge — green to emphasise high value */}
            <span
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[12px] font-extrabold"
              style={{
                background: "rgba(0,230,118,0.1)",
                border: "1px solid rgba(0,230,118,0.3)",
                color: "#00E676",
                boxShadow: "0 0 14px rgba(0,230,118,0.2)",
                textShadow: "0 0 10px rgba(0,230,118,0.5)",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              🎫 +3 Tickets
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

        {/* ── Weekly Reward Card (lazy — below fold) ── */}
        <section className="px-4 mt-3" style={{ animation: "home-card-in 0.5s 0.3s ease both" }}>
          <Suspense fallback={
            <div className="mx-4 h-64 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          }>
            <WeeklyRewardCard />
          </Suspense>
        </section>

        <Suspense fallback={null}><LegalFooter /></Suspense>
        <Suspense fallback={null}><LoginSheet /></Suspense>
        <BottomNav />

        {scannerMode && (
          <Suspense fallback={null}>
            {/* No `mode` prop → CameraScanner starts on the pre-scan type selection screen */}
            <CameraScanner onClose={() => setScannerMode(null)} />
          </Suspense>
        )}
      </div>
    </>
  );
};

export default Index;
