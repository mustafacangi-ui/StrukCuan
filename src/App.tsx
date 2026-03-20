import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { UserProvider } from "@/contexts/UserContext";
import { RadarProvider } from "@/contexts/RadarContext";   // ⭐ BUNU EKLE

import Index from "./pages/Index";
import Home from "./pages/Home";
import PostLoginRedirect from "./components/PostLoginRedirect";
import ReferralCapture from "./components/ReferralCapture";
import Promo from "./pages/Promo";
import Earn from "./pages/Earn";
import { EarnErrorBoundary } from "./components/EarnErrorBoundary";
import Map from "./pages/Map";
import WeeklyDraw from "./pages/WeeklyDraw";
import Invite from "./pages/Invite";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import CuanDashboard from "./pages/CuanDashboard";
import Rewards from "./pages/Rewards";
import Surveys from "./pages/Surveys";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PromoRules from "./pages/PromoRules";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";

const Admin = lazy(() => import("./pages/Admin"));
const ReceiptHistory = lazy(() => import("./pages/ReceiptHistory"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <RadarProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ReferralCapture />
            <PostLoginRedirect />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/old-index" element={<Index />} />
              <Route path="/map" element={<Map />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/promo" element={<Promo />} />
              <Route path="/earn" element={<EarnErrorBoundary><Earn /></EarnErrorBoundary>} />
              <Route path="/weekly-draw" element={<WeeklyDraw />} />
              <Route path="/invite" element={<Invite />} />
              <Route path="/upload" element={<Navigate to="/home" replace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/rank" element={<Navigate to="/leaderboard" replace />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/cuan" element={<CuanDashboard />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/promo-rules" element={<PromoRules />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/admin"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                      </div>
                    }
                  >
                    <Admin />
                  </Suspense>
                }
              />
              <Route
                path="/receipts"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen max-w-[420px] mx-auto flex items-center justify-center px-4">
                        <p className="text-sm text-muted-foreground">
                          Loading receipts...
                        </p>
                      </div>
                    }
                  >
                    <ReceiptHistory />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RadarProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
