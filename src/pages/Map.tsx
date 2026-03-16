import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { PageHeader } from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import PromoMap from "@/components/PromoMap";
import CameraScanner from "@/components/CameraScanner";
import { Radar } from "lucide-react";

/**
 * Map page - Kırmızı Etiket (Red Label) deal discovery.
 * Shows nearby discounted products; red pins = 50%+ discount or expiring soon.
 * FAB opens Red Label share flow.
 */
export default function Map() {
  const navigate = useNavigate();
  const { isOnboarded, requireLogin } = useUser();
  const [showRedLabelScanner, setShowRedLabelScanner] = useState(false);

  const handleFabClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setShowRedLabelScanner(true);
  };

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff6ec4] via-[#c94fd6] to-[#8e2de2]" />
      <PageHeader title="Map" onBack={() => navigate(-1)} />
      <div className="px-4 pt-2">
        <p className="text-sm text-white/80">
          Nearby deals within 3–5 km. Red pins = Kırmızı Etiket (50%+ or expiring soon).
        </p>
        <div className="mt-4">
          <PromoMap height={360} />
        </div>
      </div>

      {/* FAB - Red Label share */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg transition-all hover:scale-105 hover:bg-red-600 active:scale-95"
        aria-label="İndirim paylaş"
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
