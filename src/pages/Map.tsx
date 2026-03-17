import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Flame, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import PromoMap from "@/components/PromoMap";
import CameraScanner from "@/components/CameraScanner";
import { Radar } from "lucide-react";

const FILTERS = ["All", "Markets", "Cafes", "Electronics"] as const;

const FLASH_DEALS = [
  { id: 1, title: "Milk", subtitle: "50% Off", store: "Fresh Mart" },
  { id: 2, title: "Bread", subtitle: "2x Bonus", store: "Bakery Corner" },
];

const NEARBY_OPPORTUNITIES = [
  { id: 1, store: "Fresh Mart", distance: "0.3 km", category: "Market" },
  { id: 2, store: "Cafe Latte", distance: "0.8 km", category: "Cafe" },
  { id: 3, store: "Tech Store", distance: "1.2 km", category: "Electronics" },
  { id: 4, store: "Super Save", distance: "1.5 km", category: "Market" },
];

/**
 * Radar page - Map top 50%, scrollable panel bottom 50%.
 * Filters, Flash Deals, Nearby Opportunities in Lila/Pink glassmorphism style.
 */
export default function Map() {
  const navigate = useNavigate();
  const { isOnboarded, requireLogin } = useUser();
  const [showRedLabelScanner, setShowRedLabelScanner] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  const handleFabClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setShowRedLabelScanner(true);
  };

  return (
    <div className="min-h-screen max-w-[420px] mx-auto relative flex flex-col">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#db2777] via-[#c026d3] to-[#7c3aed]" />
      <PageHeader title="Radar" onBack={() => navigate(-1)} />

      {/* Map - Top 50% fixed */}
      <div className="flex-shrink-0 px-4 pt-2">
        <div className="rounded-xl overflow-hidden border border-violet-500/20 max-h-[50vh]">
          <PromoMap height={typeof window !== "undefined" ? Math.max(200, Math.floor(window.innerHeight * 0.5) - 48) : 240} />
        </div>
      </div>

      {/* Scrollable Panel - Bottom 50% */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {/* Layer 1: Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all backdrop-blur-sm ${
                activeFilter === f
                  ? "bg-emerald-500/50 text-white border border-emerald-400/60 shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                  : "bg-white/30 text-slate-800 border border-white/40 hover:bg-white/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Layer 2: Flash Deals */}
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white/95 mb-3">
            <Flame size={16} className="text-orange-400" />
            Flash Deals
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {FLASH_DEALS.map((deal) => (
              <div
                key={deal.id}
                className="flex-shrink-0 w-[160px] rounded-2xl border border-violet-400/25 bg-violet-500/10 bg-gradient-to-br from-violet-500/20 via-violet-500/5 to-pink-500/15 p-4 backdrop-blur-xl"
              >
                <p className="font-display font-bold text-slate-800">{deal.title}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{deal.subtitle}</p>
                <p className="text-[10px] text-slate-600 mt-1">{deal.store}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Layer 3: Nearby Opportunities */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white/95 mb-3">
            <MapPin size={16} className="text-pink-400" />
            Nearby Opportunities
          </h3>
          <div className="space-y-3">
            {NEARBY_OPPORTUNITIES.map((opp) => (
              <div
                key={opp.id}
                className="rounded-2xl border border-pink-400/20 bg-pink-500/20 bg-gradient-to-br from-pink-500/15 via-pink-500/5 to-violet-500/10 p-4 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-slate-800">{opp.store}</p>
                    <p className="text-[10px] text-slate-600">
                      {opp.distance} · {opp.category}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {opp.distance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FAB - Red Label share */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/40 transition-all hover:scale-105 hover:shadow-emerald-500/50 active:scale-95"
        aria-label="Share discount"
      >
        <Radar size={24} className="text-white" />
      </button>

      <BottomNav />

      {showRedLabelScanner && (
        <CameraScanner
          mode="red_label"
          onClose={() => setShowRedLabelScanner(false)}
        />
      )}
    </div>
  );
}
