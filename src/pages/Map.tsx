import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { ArrowLeft, Settings, Ticket } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PromoMap from "@/components/PromoMap";
import CameraScanner from "@/components/CameraScanner";
import { Radar } from "lucide-react";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useRadar } from "@/contexts/RadarContext";

// ─── Static data ────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "All",         icon: "🌐" },
  { key: "Markets",     icon: "🛒" },
  { key: "Cafes",       icon: "☕" },
  { key: "Electronics", icon: "⚡" },
  { key: "Fashion",     icon: "👗" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

const FLASH_DEALS = [
  { id: 1, title: "Milk",   discount: "40% Off",    color: "green" as const, store: "Fresh Mart"    },
  { id: 2, title: "Bread",  discount: "5x Bonus",   color: "gold"  as const, store: "Bakery Corner" },
  { id: 3, title: "Coffee", discount: "Buy 1 Get 1", color: "green" as const, store: "Cafe Latte"    },
  { id: 4, title: "Cable",  discount: "25% Off",    color: "gold"  as const, store: "Tech Store"    },
];

const NEARBY_OPPORTUNITIES = [
  { id: 1, store: "Fresh Mart",  distanceKm: 0.3, category: "Market",      hasRedLabel: true  },
  { id: 2, store: "Cafe Latte",  distanceKm: 0.8, category: "Cafe",        hasRedLabel: false },
  { id: 3, store: "Tech Store",  distanceKm: 1.2, category: "Electronics", hasRedLabel: false },
  { id: 4, store: "Super Save",  distanceKm: 1.5, category: "Market",      hasRedLabel: true  },
];

const CATEGORY_MAP: Record<FilterKey, string[]> = {
  All:         ["Market","Cafe","Electronics","Fashion"],
  Markets:     ["Market"],
  Cafes:       ["Cafe"],
  Electronics: ["Electronics"],
  Fashion:     ["Fashion"],
};

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Map() {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { radius } = useRadar();

  const [showRedLabelScanner, setShowRedLabelScanner] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");

  // Filter nearby list by selected radius + category chip
  const filteredOpportunities = useMemo(() => {
    const cats = CATEGORY_MAP[activeFilter];
    return NEARBY_OPPORTUNITIES.filter(
      (o) => o.distanceKm <= radius && cats.includes(o.category)
    );
  }, [radius, activeFilter]);

  const handleFabClick = () => {
    if (!isOnboarded) { requireLogin("camera"); return; }
    setShowRedLabelScanner(true);
  };

  return (
    <div className="min-h-screen max-w-[430px] mx-auto relative flex flex-col pb-20">
      {/* Background — deep dark purple to match Earn page */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: "linear-gradient(160deg,#0f0726 0%,#1a0d40 50%,#0d0520 100%)" }}
      />

      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center gap-3"
        style={{ background: "rgba(15,7,38,0.75)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-display text-xl font-bold text-white flex-1 tracking-tight">Radar</h1>

        {/* Glowing red ticket badge */}
        <button
          onClick={() => navigate("/rewards")}
          className="rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all hover:scale-[1.05] active:scale-[0.97]"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            boxShadow: "0 0 12px rgba(239,68,68,0.4)",
          }}
        >
          <Ticket size={13} className="text-[#ef4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
          <span className="text-[11px] font-bold text-white">{weeklyTickets}</span>
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 shrink-0 hover:bg-white/20 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="mx-3.5 mt-3.5 rounded-[20px] overflow-hidden border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-h-[50vh]">
        <PromoMap
          height={
            typeof window !== "undefined"
              ? Math.max(200, Math.floor(window.innerHeight * 0.45) - 48)
              : 240
          }
        />
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-4 space-y-6">

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(({ key, icon }) => {
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className="flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 flex items-center gap-1.5"
                style={
                  isActive
                    ? {
                        background: "rgba(0,230,118,0.15)",
                        border: "1px solid rgba(0,230,118,0.45)",
                        color: "#00E676",
                        boxShadow: "0 0 14px rgba(0,230,118,0.45)",
                        transform: "scale(1.05)",
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.6)",
                      }
                }
              >
                <span>{icon}</span>
                {key}
              </button>
            );
          })}
        </div>

        {/* ── Flash Deals ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-white">
              <span>🔥</span> Flash Deals
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#00E676", textShadow: "0 0 8px rgba(0,230,118,0.6)" }}>
              Within {radius} km
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {FLASH_DEALS.map((deal) => (
              <FlashDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>

        {/* ── Nearby Opportunities ─────────────────────────────────────── */}
        <section>
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-white mb-3">
            <span>📍</span> Nearby Opportunities
            <span className="ml-auto text-[10px] font-normal text-white/40 uppercase tracking-widest">
              within {radius} km
            </span>
          </h3>

          {filteredOpportunities.length === 0 ? (
            <div className="rounded-2xl py-8 text-center"
              style={{ background: "rgba(10,8,14,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-sm text-white/40">No opportunities within {radius} km</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredOpportunities.map((opp) => (
                <NearbyRow key={opp.id} opp={opp} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* FAB — green neon scanner button */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        aria-label="Scan Red Label"
        style={{
          background: "linear-gradient(135deg, #00E676 0%, #00c853 100%)",
          animation: "fab-glow-pulse 2s ease-in-out infinite",
        }}
      >
        <Radar size={26} className="text-[#001a09]" />
      </button>

      <BottomNav />

      {showRedLabelScanner && (
        <CameraScanner mode="red_label" onClose={() => setShowRedLabelScanner(false)} />
      )}
    </div>
  );
}

// ─── Flash Deal Card ──────────────────────────────────────────────────────────

function FlashDealCard({ deal }: { deal: typeof FLASH_DEALS[number] }) {
  const isGreen = deal.color === "green";
  const glowColor = isGreen ? "rgba(74,222,128,0.7)" : "rgba(251,191,36,0.7)";
  const textColor = isGreen ? "#4ade80" : "#fbbf24";

  return (
    <div
      className="rounded-2xl p-3.5 cursor-pointer transition-all duration-200 hover:scale-[1.03]"
      style={{
        background: "rgba(10,8,14,0.7)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 20px ${glowColor.replace("0.7","0.35")}, 0 4px 16px rgba(0,0,0,0.4)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)";
      }}
    >
      <p className="font-display font-bold text-white text-[15px]">{deal.title}</p>
      <p
        className="text-[12px] font-bold mt-1"
        style={{ color: textColor, textShadow: `0 0 10px ${glowColor}` }}
      >
        {deal.discount}
      </p>
      <p className="text-[10px] text-white/50 mt-0.5">{deal.store}</p>
    </div>
  );
}

// ─── Nearby Row ───────────────────────────────────────────────────────────────

function NearbyRow({ opp }: { opp: typeof NEARBY_OPPORTUNITIES[number] }) {
  const isVeryClose = opp.distanceKm <= 0.5;
  const showPulseRing = opp.hasRedLabel && isVeryClose;

  return (
    <div
      className="rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.015]"
      style={{
        background: "rgba(10,8,14,0.65)",
        border: opp.hasRedLabel
          ? "1px solid rgba(239,68,68,0.2)"
          : "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(14px)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 0 16px rgba(168,85,247,0.25), 0 4px 12px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Left: store info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Category icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
          style={{
            background: opp.hasRedLabel ? "rgba(239,68,68,0.12)" : "rgba(168,85,247,0.12)",
            border: opp.hasRedLabel ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(168,85,247,0.2)",
          }}
        >
          {opp.category === "Market"      ? "🛒"
           : opp.category === "Cafe"      ? "☕"
           : opp.category === "Electronics" ? "⚡"
           : "🏪"}
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-white text-sm leading-tight">{opp.store}</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {formatDist(opp.distanceKm)} · {opp.category}
            {opp.hasRedLabel && (
              <span className="ml-1.5 text-[#ef4444]" style={{ textShadow: "0 0 6px rgba(239,68,68,0.7)" }}>
                🔴 Red Label
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Right: distance badge */}
      <div className="relative shrink-0 ml-3 flex items-center justify-center">
        {/* Outer pulsing ring — only for very-close red label stores */}
        {showPulseRing && (
          <span
            className="absolute rounded-xl animate-pulse"
            style={{
              inset: "-4px",
              border: "1.5px dashed rgba(239,68,68,0.65)",
              boxShadow: "0 0 8px rgba(239,68,68,0.35)",
            }}
          />
        )}
        <span
          className="relative rounded-xl px-3 py-1.5 text-[11px] font-bold block whitespace-nowrap"
          style={
            opp.hasRedLabel
              ? {
                  background: "rgba(239,68,68,0.12)",
                  border: "1.5px dashed rgba(239,68,68,0.5)",
                  color: "#ef4444",
                  textShadow: "0 0 8px rgba(239,68,68,0.8)",
                  boxShadow: "0 0 10px rgba(239,68,68,0.2)",
                }
              : {
                  background: "rgba(0,230,118,0.1)",
                  border: "1px solid rgba(0,230,118,0.35)",
                  color: "#00E676",
                  textShadow: "0 0 6px rgba(0,230,118,0.6)",
                }
          }
        >
          {formatDist(opp.distanceKm)}
        </span>
      </div>
    </div>
  );
}
