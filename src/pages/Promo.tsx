import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import PromoMap from "@/components/PromoMap";
import LiveFeed from "@/components/LiveFeed";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";

export default function Promo() {
  const { isOnboarded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isOnboarded, navigate]);

  if (!isOnboarded) return null;

  return (
    <div className="min-h-screen bg-background pb-28 max-w-md mx-auto">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-display text-lg font-bold text-foreground">
          Promo Merah
        </h1>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Promo di sekitarmu
        </p>
      </div>

      <div className="mx-4 mt-4 h-[280px] rounded-xl overflow-hidden border border-border">
        <PromoMap />
      </div>

      <LiveFeed />

      {/* Banner ad placeholder */}
      <div className="mx-4 mt-4 rounded-lg border border-border bg-card/50 px-4 py-4 text-center min-h-[90px] flex flex-col items-center justify-center">
        <p className="text-[9px] text-muted-foreground/50 mb-1">
          Sponsor
        </p>
        <div className="w-full h-16 rounded-md bg-secondary/50 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground/40">
            Banner Ad
          </span>
        </div>
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
