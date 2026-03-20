import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, MapPin, Clock, Percent } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import { MAX_TICKETS_PER_WEEK } from "@/lib/constants";
import { getCountdownParts, pad } from "@/lib/weeklyCountdown";

import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import CameraScanner from "@/components/CameraScanner";

type ScannerMode = "receipt" | "red_label" | null;

// Mock nearby deals data
const NEARBY_DEALS = [
  { id: 1, store: "Alfamart Sudirman", discount: 40, distance: "250m", category: "Grocery", time: "2 min ago" },
  { id: 2, store: "Indomaret Central", discount: 25, distance: "450m", category: "Grocery", time: "8 min ago" },
  { id: 3, store: "Giant Express", discount: 35, distance: "800m", category: "Supermarket", time: "15 min ago" },
];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: ticketCount = 0 } = useUserTickets(user?.id);
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const progressPercent = Math.min(100, (ticketCount / MAX_TICKETS_PER_WEEK) * 100);

  useEffect(() => {
    const tick = () => setTimeLeft(getCountdownParts());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const state = location.state as { requireLogin?: "camera" | "profile"; openCamera?: boolean } | null;
    if (state?.requireLogin) {
      requireLogin(state.requireLogin);
      navigate("/", { replace: true });
    }
    if (state?.openCamera) {
      setScannerMode("receipt");
      navigate("/", { replace: true, state: {} });
    }
  }, [location.state, requireLogin, navigate]);

  const handleScan = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setScannerMode("receipt");
  };

  return (
    <div className="min-h-screen pb-28 w-full max-w-[430px] mx-auto relative">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #0d1424 50%, #0a0f1a 100%)" }}
      />

      {/* Radial glow behind hero */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] -z-5 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 40%, transparent 70%)",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative px-6 pt-16 pb-8">
        {/* Subtle animated light pulse */}
        <div 
          className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,230,118,0.12) 0%, transparent 70%)",
            animation: "hero-pulse 4s ease-in-out infinite",
          }}
        />

        <div className="relative z-10 text-center">
          <h1 className="font-display text-3xl font-bold text-white leading-tight">
            Scan Deals &<br />
            <span className="text-[#00E676]">Earn Rewards</span>
          </h1>
          <p className="mt-3 text-sm text-white/60 max-w-[280px] mx-auto">
            Capture receipts and discount labels to win weekly prizes
          </p>

          {/* Main CTA Button */}
          <button
            onClick={handleScan}
            className="mt-8 relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-display font-bold text-base text-[#0a0f1a] transition-all hover:scale-105 active:scale-95"
            style={{
              background: "#00E676",
              boxShadow: "0 0 40px rgba(0,230,118,0.5), 0 0 80px rgba(0,230,118,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Camera size={20} />
            Scan Now
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          WEEKLY REWARD CARD
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 mt-2">
        <div 
          className="rounded-2xl p-5 backdrop-blur-xl"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Weekly Prize</p>
              <p className="font-display text-xl font-bold text-white mt-1">Rp 500,000</p>
            </div>
            <div 
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{
                background: "rgba(0,230,118,0.15)",
                border: "1px solid rgba(0,230,118,0.3)",
                color: "#00E676",
              }}
            >
              5 Winners
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-white/50">Your Tickets</span>
              <span className="text-white font-semibold">{ticketCount} / {MAX_TICKETS_PER_WEEK}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #00E676 0%, #00c853 100%)",
                  boxShadow: "0 0 12px rgba(0,230,118,0.5)",
                }}
              />
            </div>
          </div>

          {/* Countdown */}
          <div className="flex gap-2">
            {[
              { val: pad(timeLeft.days), label: "Days" },
              { val: pad(timeLeft.hours), label: "Hrs" },
              { val: pad(timeLeft.minutes), label: "Min" },
              { val: pad(timeLeft.seconds), label: "Sec" },
            ].map((block) => (
              <div 
                key={block.label} 
                className="flex-1 rounded-xl py-2.5 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="font-display text-lg font-bold text-white tabular-nums">{block.val}</span>
                <span className="block text-[9px] text-white/40 uppercase mt-0.5">{block.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          NEARBY DEALS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin size={14} className="text-[#00E676]" />
            Nearby Deals
          </h2>
          <button 
            onClick={() => navigate("/map")}
            className="text-[11px] text-[#00E676] font-semibold hover:underline"
          >
            View Map
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {NEARBY_DEALS.map((deal, index) => (
            <div
              key={deal.id}
              className="rounded-2xl p-4 backdrop-blur-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                animationDelay: `${index * 100}ms`,
              }}
              onClick={() => navigate("/map")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: "rgba(0,230,118,0.1)",
                      border: "1px solid rgba(0,230,118,0.2)",
                    }}
                  >
                    <Percent size={18} className="text-[#00E676]" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-white text-sm">{deal.store}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-white/50">{deal.distance}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-[11px] text-white/50 flex items-center gap-1">
                        <Clock size={10} />
                        {deal.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Discount Badge */}
                <div 
                  className="px-3 py-1.5 rounded-xl text-sm font-bold"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                    textShadow: "0 0 8px rgba(239,68,68,0.5)",
                  }}
                >
                  -{deal.discount}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FLOATING CAMERA BUTTON
      ═══════════════════════════════════════════════════════════════════ */}
      <button
        onClick={handleScan}
        className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
        style={{
          background: "#00E676",
          boxShadow: "0 0 30px rgba(0,230,118,0.6), 0 0 60px rgba(0,230,118,0.3)",
          animation: "fab-breathe 3s ease-in-out infinite",
        }}
        aria-label="Scan"
      >
        <Camera size={26} className="text-[#0a0f1a]" />
      </button>

      {/* Navigation & Sheets */}
      <BottomNav />
      <LoginSheet />

      {scannerMode && (
        <CameraScanner mode={scannerMode} onClose={() => setScannerMode(null)} />
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes hero-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, 0) scale(1); }
          50% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
        }
        @keyframes fab-breathe {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(0,230,118,0.6), 0 0 60px rgba(0,230,118,0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 40px rgba(0,230,118,0.8), 0 0 80px rgba(0,230,118,0.4);
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
