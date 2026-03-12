import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Camera } from "lucide-react";

import Header from "@/components/Header";
import PrizeSection from "@/components/PrizeSection";
import DailyMissionStreak from "@/components/DailyMissionStreak";
import UserDashboard from "@/components/UserDashboard";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";
import LegalFooter from "@/components/LegalFooter";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnboarded, requireLogin } = useUser();

  // When redirected from Upload/Settings with requireLogin state, open login sheet
  useEffect(() => {
    const state = location.state as { requireLogin?: "camera" | "profile" } | null;
    if (state?.requireLogin) {
      requireLogin(state.requireLogin);
      navigate("/", { replace: true }); // Clear state to avoid re-triggering
    }
  }, [location.state, requireLogin, navigate]);

  const handleCameraClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    navigate("/upload");
  };

  return (
    <div className="min-h-screen bg-background pb-28 max-w-[420px] mx-auto">
      <Header />

      <div className="mt-4">
        <PrizeSection />
      </div>

      <DailyMissionStreak />

      {/* Large camera button */}
      <div className="mx-4 mt-6 flex flex-col items-center">
        <button
          onClick={handleCameraClick}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-primary"
          aria-label="Upload receipt"
        >
          <Camera size={40} className="text-primary-foreground" />
        </button>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          Ambil Foto Struk
        </p>
      </div>

      <UserDashboard />

      <LeaderboardPreview />

      <LegalFooter />
      <LoginSheet />
      <BottomNav />
    </div>
  );
};

export default Index;