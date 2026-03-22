import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { ArrowLeft, Settings, Ticket } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PromoMap from "@/components/PromoMap";
import CameraScanner from "@/components/CameraScanner";
import DealModal from "@/components/DealModal";
import DealCard from "@/components/DealCard";
import NearbyRow from "@/components/NearbyRow";
import NearbyList from "@/components/NearbyList";
import RadarSkeleton from "@/components/RadarSkeleton";
import { Radar } from "lucide-react";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useRadar } from "@/contexts/RadarContext";
import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import { CARD_GLASS, BTN_GLASS, PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

// ─── Category filters ────────────────────────────────────────────────────────

const FILTERS = [
  { key: "All", icon: "🌐" },
  { key: "Markets", icon: "🛒" },
  { key: "Cafes", icon: "☕" },
  { key: "Electronics", icon: "⚡" },
  { key: "Fashion", icon: "👗" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const CATEGORY_MAP: Record<FilterKey, string[]> = {
  All: ["Market", "Cafe", "Electronics", "Fashion", "General"],
  Markets: ["Market"],
  Cafes: ["Cafe"],
  Electronics: ["Electronics"],
  Fashion: ["Fashion"],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Map() {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const { radius, deals, locationReady } = useRadar();

  const [showRedLabelScanner, setShowRedLabelScanner] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [selectedDeal, setSelectedDeal] = useState<DealWithDistance | null>(null);

  const cats = CATEGORY_MAP[activeFilter];

  const filteredDeals = useMemo(() => {
    const list = Array.isArray(deals) ? deals : [];
    return list
      .filter((d): d is DealWithDistance => d != null && typeof d.category === "string")
      .filter((d) => cats.includes(d.category));
  }, [deals, cats]);

  const flashDeals = useMemo(() => filteredDeals.slice(0, 4), [filteredDeals]);
  const nearbyDeals = useMemo(() => filteredDeals, [filteredDeals]);

  const handleFabClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setShowRedLabelScanner(true);
  };

  // Hata Koruması — Safe Render: show skeleton until location is ready
  if (!locationReady) {
    return <RadarSkeleton />;
  }

  return (
    <div className="min-h-screen max-w-[430px] mx-auto relative flex flex-col pb-20">
      {/* Premium dark background — matches Home screen gold standard */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: PREMIUM_PAGE_BACKGROUND }}
      />

      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center gap-3"
        style={{ background: "rgba(15,7,38,0.75)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 ${BTN_GLASS}`}
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-display text-xl font-bold text-white flex-1 tracking-tight">
          Radar
        </h1>

        <button
          onClick={() => navigate("/rewards")}
          className="rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all hover:scale-[1.05] active:scale-[0.97]"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            boxShadow: "0 0 12px rgba(239,68,68,0.4)",
          }}
        >
          <Ticket
            size={13}
            className="text-[#ef4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]"
          />
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
          onDealSelect={(deal) => setSelectedDeal(deal)}
          selectedDealId={selectedDeal?.id ?? null}
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
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: "#00E676",
                textShadow: "0 0 8px rgba(0,230,118,0.6)",
              }}
            >
              Within {radius} km
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {flashDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => setSelectedDeal(deal)}
              />
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

          {nearbyDeals.length === 0 ? (
            <div className={`rounded-2xl py-8 text-center ${CARD_GLASS}`}>
              <p className="text-sm text-white/40">
                No opportunities within {radius} km
              </p>
            </div>
          ) : (
            <NearbyList>
              {nearbyDeals.map((deal, index) => (
                <NearbyRow
                  key={deal.id}
                  deal={deal}
                  index={index}
                  onClick={() => setSelectedDeal(deal)}
                />
              ))}
            </NearbyList>
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
        <CameraScanner
          mode="red_label"
          onClose={() => setShowRedLabelScanner(false)}
        />
      )}

      {selectedDeal && (
        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </div>
  );
}
