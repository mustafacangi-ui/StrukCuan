import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Flame, MapPin, ArrowLeft, Settings, Ticket, Coins } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PromoMap from "@/components/PromoMap";
import CameraScanner from "@/components/CameraScanner";
import { Radar } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserTickets } from "@/hooks/useUserTickets";

const FILTERS = ["All", "Markets", "Cafes", "Electronics", "Fashion"] as const;

const FLASH_DEALS = [
  { id: 1, title: "Milk", discount: "40% Off", discountColor: "green" as const, store: "Fresh Mart" },
  { id: 2, title: "Bread", discount: "5x Bonus", discountColor: "gold" as const, store: "Bakery Corner" },
  { id: 3, title: "Coffee", discount: "Buy 1 Get 1", discountColor: "green" as const, store: "Cafe Latte" },
  { id: 4, title: "Cable", discount: "25% Off", discountColor: "gold" as const, store: "Tech Store" },
];

const NEARBY_OPPORTUNITIES = [
  { id: 1, store: "Fresh Mart", distance: "0.3 km", category: "Market" },
  { id: 2, store: "Cafe Latte", distance: "0.8 km", category: "Cafe" },
  { id: 3, store: "Tech Store", distance: "1.2 km", category: "Electronics" },
  { id: 4, store: "Super Save", distance: "1.5 km", category: "Market" },
];

/**
 * Radar page - HTML design: topbar, map, filters, flash deals, nearby.
 * Theme: #ff4ecd → #9b5cff → #1a0f3c, glass, #00E676 green.
 */
export default function Map() {
  const navigate = useNavigate();
  const { user, isOnboarded, requireLogin } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const { data: weeklyTickets = 0 } = useUserTickets(user?.id);
  const [showRedLabelScanner, setShowRedLabelScanner] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  const cuan = stats?.cuan ?? 0;

  const handleFabClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setShowRedLabelScanner(true);
  };

  return (
    <div className="min-h-screen max-w-[430px] mx-auto relative flex flex-col pb-20">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff4ecd] via-[#9b5cff] to-[#1a0f3c] bg-fixed" />

      {/* Topbar - HTML style */}
      <div className="sticky top-0 z-50 bg-[rgba(180,40,140,0.28)] backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-xl font-bold text-white flex-1 tracking-tight">Radar</h1>
        <div className="flex items-center gap-2">
          <div className="rounded-full px-3 py-1.5 bg-red-500/20 border border-red-500/30 flex items-center gap-1">
            <Ticket size={12} className="text-red-300" />
            <span className="text-[11px] font-semibold text-red-200">{weeklyTickets}</span>
          </div>
          <div className="rounded-full px-3 py-1.5 bg-theme-gold/20 border border-theme-gold/30 flex items-center gap-1">
            <Coins size={12} className="text-theme-gold" />
            <span className="text-[11px] font-semibold text-theme-gold">Cuan {cuan}</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 shrink-0"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Map */}
      <div className="mx-3.5 mt-3.5 rounded-[20px] overflow-hidden border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)] max-h-[50vh]">
        <PromoMap height={typeof window !== "undefined" ? Math.max(200, Math.floor(window.innerHeight * 0.45) - 48) : 240} />
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-4">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all border ${
                activeFilter === f
                  ? "bg-white text-[#1a1a1a] shadow-lg border-white/30"
                  : "glass border-white/20 text-[#FFFFFF] hover:bg-white/15"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Flash Deals - 2x2 grid */}
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#FFFFFF] mb-2.5">
            <span className="text-base">🔥</span>
            Flash Deals
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {FLASH_DEALS.map((deal) => (
              <div
                key={deal.id}
                className="glass rounded-2xl p-3.5 border border-white/20 hover:-translate-y-0.5 transition-transform cursor-pointer"
              >
                <p className="font-display font-bold text-[#FFFFFF] text-[15px]">{deal.title}</p>
                <p className={`text-[11px] font-bold mt-1 ${
                  deal.discountColor === "green" ? "text-theme-green" : "text-theme-gold"
                }`}>
                  {deal.discount}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">{deal.store}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby Opportunities */}
        <section>
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#FFFFFF] mb-2.5">
            <span className="text-[15px]">📍</span>
            Nearby Opportunities
          </h3>
          <div className="flex flex-col gap-2">
            {NEARBY_OPPORTUNITIES.map((opp) => (
              <div
                key={opp.id}
                className="glass rounded-[14px] p-3.5 border border-white/20 flex items-center justify-between hover:translate-x-1 hover:bg-white/15 transition-all cursor-pointer"
              >
                <div>
                  <p className="font-display font-bold text-[#FFFFFF] text-sm">{opp.store}</p>
                  <p className="text-[11px] text-white/60">
                    {opp.distance} · {opp.category}
                  </p>
                </div>
                <span className="rounded-[10px] px-2.5 py-1 bg-theme-green/15 border border-theme-green/30 text-[11px] font-bold text-theme-green shrink-0">
                  {opp.distance}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FAB - Share discount */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-theme-green text-[#001a09] shadow-[0_0_18px_rgba(0,230,118,0.55)] transition-all hover:scale-105 active:scale-95"
        aria-label="Share discount"
      >
        <Radar size={24} className="text-[#001a09]" />
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
