import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

import Header from "@/components/Header";
import AddDealForm from "@/components/AddDealForm";
import NotificationBanner from "@/components/NotificationBanner";
import PrizeSection from "@/components/PrizeSection";
import UserDashboard from "@/components/UserDashboard";
import ReceiptScanner from "@/components/ReceiptScanner";
import RadarCuan from "@/components/RadarCuan";
import PromoMap from "@/components/PromoMap";
import LiveFeed from "@/components/LiveFeed";
import HistoryTab from "@/components/HistoryTab";
import FloatingActionButton from "@/components/FloatingActionButton";
import BottomNav from "@/components/BottomNav";
import LoginSheet from "@/components/LoginSheet";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"home" | "history">("home");
  const navigate = useNavigate();
  const { isOnboarded } = useUser();

  useEffect(() => {
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isOnboarded, navigate]);

  const testInsert = async () => {
    const { data, error } = await supabase
      .from("deals")
      .insert([
        {
          product_name: "Indomie Goreng",
          price: 3500,
          store: "Indomaret",
          lat: -6.2,
          lng: 106.8
        }
      ]);

    console.log("DATA:", data);
    console.log("ERROR:", error);
  };

  return (
    <div className="min-h-screen bg-background pb-28 max-w-md mx-auto">

        <Header />

        <AddDealForm />

        <UserDashboard />

        <NotificationBanner />

        {/* TEST BUTTON */}
        <div className="mx-4 mt-3">
          <button
            onClick={testInsert}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs"
          >
            Test Insert Deal
          </button>
        </div>

        {/* TAB SWITCHER */}
        <div className="mx-4 mt-3 flex rounded-lg bg-secondary p-1">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "home"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Beranda
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "history"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Riwayat
          </button>
        </div>

        {activeTab === "home" ? (
          <>
            <div className="mt-4">
              <PrizeSection />
            </div>

            <ReceiptScanner />

            <RadarCuan />

            {/* MAP SECTION */}
            <div className="mx-4 mt-4 h-[320px] rounded-xl overflow-hidden border border-border">
              <PromoMap />
            </div>

            <LiveFeed />

            {/* AD PLACEHOLDER */}
            <div className="mx-4 mt-4 rounded-lg border border-border bg-card/50 px-4 py-3 text-center">
              <p className="text-[9px] text-muted-foreground/50 mb-1">
                Sponsor
              </p>
              <div className="h-14 rounded-md bg-secondary/50 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/40">
                  Responsive Display Ad
                </span>
              </div>
            </div>
          </>
        ) : (
          <HistoryTab />
        )}

        {/* FOOTER */}
        <div className="mx-4 mt-6 mb-2 text-center">
          <p className="text-[9px] text-muted-foreground/40">
            © 2026 StrukCuan · Terms of Service · Privacy Policy
          </p>
        </div>

        <FloatingActionButton />
        <LoginSheet />
        <BottomNav />

      </div>
  );
};

export default Index;