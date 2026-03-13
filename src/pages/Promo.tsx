import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import PromoHeader from "@/components/PromoHeader";
import FeaturedDealCard from "@/components/FeaturedDealCard";
import CommunityPromoCard from "@/components/CommunityPromoCard";
import SharePromoSheet from "@/components/SharePromoSheet";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { usePromosNearby } from "@/hooks/usePromos";
import { useFeaturedDeals } from "@/hooks/useFeaturedDeals";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useUserLocationSync } from "@/hooks/useUserLocationSync";
import { useRadar } from "@/contexts/RadarContext";
import RadarCuanMap from "@/components/RadarCuanMap";
import FreeTicketEvent from "@/components/FreeTicketEvent";

export default function Promo() {
  const { user, isOnboarded, isLoading } = useUser();
  const navigate = useNavigate();
  const { location } = useUserLocation();
  const { radius } = useRadar();
  const [showShareSheet, setShowShareSheet] = useState(false);

  const { deals: featuredDeals = [], isLoading: dealsLoading } = useFeaturedDeals();
  const { data: promos = [], isLoading: promosLoading } = usePromosNearby(
    location.lat,
    location.lng,
    user?.id,
    radius
  );

  useUserLocationSync(user?.id, location.lat, location.lng);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen max-w-[420px] mx-auto flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!isOnboarded) return null;

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto">
      <PromoHeader />

      {/* SECTION 1: Radar Cuan (Mapbox map) */}
      <div className="mt-4 px-4">
        <RadarCuanMap />
      </div>

      {/* SECTION 2: Promo Unggulan (admin deals) */}
      <div className="mt-6 px-4">
        <h2 className="font-display text-sm font-bold text-foreground mb-3">
          Promo Unggulan di Sekitarmu
        </h2>
        {dealsLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Memuat...</p>
          </div>
        ) : featuredDeals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada featured deals.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {featuredDeals.map((deal) => (
              <FeaturedDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Community Promos */}
      <div className="mt-6 px-4">
        <h2 className="font-display text-sm font-bold text-foreground mb-3">
          Promo Komunitas di Sekitarmu
        </h2>
        {promosLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Memuat promo...</p>
          </div>
        ) : promos.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada promo di dekat kamu.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Jadi yang pertama menemukan promo!
            </p>
            <button
              onClick={() => setShowShareSheet(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display font-bold text-sm text-primary-foreground"
            >
              <Share2 size={16} />
              <span>Bagikan Promo</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {promos.map((promo) => (
              <CommunityPromoCard key={promo.id} promo={promo} />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: Free Ticket Event */}
      <div className="mt-6 px-4">
        <FreeTicketEvent />
      </div>

      <SharePromoSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
      />

      <button
        onClick={() => setShowShareSheet(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 font-display font-bold text-sm text-primary-foreground shadow-lg"
      >
        <Share2 size={18} />
        <span>Bagikan Promo</span>
      </button>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
