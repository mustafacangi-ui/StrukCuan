import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import PromoHeader from "@/components/PromoHeader";
import FreeTicketEvent from "@/components/FreeTicketEvent";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";

/**
 * Promo page - rewarded ad ticket system only.
 * Map and location features disabled for stability.
 */
export default function Promo() {
  const { isOnboarded, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto">
      <PromoHeader />

      {/* Free Tickets - rewarded ad system */}
      <div className="mt-6 px-4">
        <FreeTicketEvent />
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
