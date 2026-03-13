import { useState, useEffect, lazy, Suspense, memo } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import PromoHeader from "@/components/PromoHeader";
import FeaturedDealCard from "@/components/FeaturedDealCard";
import CommunityPromoCard from "@/components/CommunityPromoCard";
import SharePromoSheet from "@/components/SharePromoSheet";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromoPageData } from "@/hooks/usePromoPageData";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useUserLocationSync } from "@/hooks/useUserLocationSync";
import FreeTicketEvent from "@/components/FreeTicketEvent";

const RadarCuanMap = lazy(() => import("@/components/RadarCuanMap"));

const MapSkeleton = memo(function MapSkeleton() {
  return (
    <div className="h-[200px] w-full rounded-xl overflow-hidden bg-muted/50">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
});

export default function Promo() {
  const { user, isOnboarded, isLoading } = useUser();
  const navigate = useNavigate();
  const [showShareSheet, setShowShareSheet] = useState(false);

  const { location } = useUserLocation();
  useUserLocationSync(user?.id, location.lat, location.lng);
  const {
    featuredDeals,
    communityPromos,
    featuredLoading,
    communityLoading,
  } = usePromoPageData(user?.id);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  // Always render layout - never block. Redirect happens in useEffect.

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto">
      <PromoHeader />

      {/* SECTION 1: Radar Cuan (Mapbox map) - lazy loaded */}
      <div className="mt-4 px-4">
        <Suspense fallback={<MapSkeleton />}>
          <RadarCuanMap />
        </Suspense>
      </div>

      {/* SECTION 2: Promo Unggulan (admin deals) */}
      <div className="mt-6 px-4">
        <h2 className="font-display text-sm font-bold text-foreground mb-3">
          Promo Unggulan di Sekitarmu
        </h2>
        {featuredLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : featuredDeals?.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada featured deals.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(featuredDeals ?? []).map((deal) => (
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
        {communityLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : communityPromos?.length === 0 ? (
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
            {(communityPromos ?? []).map((promo) => (
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
