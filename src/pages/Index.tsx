import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

import Header from "@/components/Header";
import WeeklyRewardCard from "@/components/WeeklyRewardCard";
import DailyMissionStreak from "@/components/DailyMissionStreak";
import UserDashboard from "@/components/UserDashboard";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";
import CameraScanner from "@/components/CameraScanner";

type ScannerMode = "receipt" | "red_label" | null;

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnboarded, requireLogin } = useUser();
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);

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

  const handleOpenReceiptScanner = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setScannerMode("receipt");
  };

  const handleOpenRedLabelScanner = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    setScannerMode("red_label");
  };

  return (
    <div className="min-h-screen pb-28 w-full max-w-[420px] mx-auto">
      {/* Global gradient - fuchsia top → purple bottom */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff6ec4] via-[#c94fd6] to-[#8e2de2]" />

      <Header
        onUploadReceipt={handleOpenReceiptScanner}
        onShareDiscount={handleOpenRedLabelScanner}
      />

      <div className="mt-4 space-y-4">
        {/* Weekly Reward Card */}
        <WeeklyRewardCard />

        {/* Daily Mission & Streak */}
        <DailyMissionStreak onOpenScanner={handleOpenReceiptScanner} />

        {/* Section 5 — Level Progress */}
        {/* Section 6 — History */}
        <UserDashboard />

        <LeaderboardPreview />
      </div>

      <LegalFooter />
      <LoginSheet />
      <BottomNav />

      {scannerMode && (
        <CameraScanner
          mode={scannerMode}
          onClose={() => setScannerMode(null)}
        />
      )}
    </div>
  );
};

export default Index;
