import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { UserProvider } from "@/contexts/UserContext";
import { RadarProvider } from "@/contexts/RadarContext";

// ── Eager — must be ready on first paint (LCP page) ──────────────────────────
import Index from "./pages/Index";
import PostLoginRedirect from "./components/PostLoginRedirect";
import ReferralCapture from "./components/ReferralCapture";
import { EarnErrorBoundary } from "./components/EarnErrorBoundary";

// ── Lazy — only download when the user navigates there ───────────────────────
const Map           = lazy(() => import("./pages/Map"));
const Promo         = lazy(() => import("./pages/Promo"));
const Earn          = lazy(() => import("./pages/Earn"));
const WeeklyDraw    = lazy(() => import("./pages/WeeklyDraw"));
const Invite        = lazy(() => import("./pages/Invite"));
const Leaderboard   = lazy(() => import("./pages/Leaderboard"));
const Settings      = lazy(() => import("./pages/Settings"));
const CuanDashboard = lazy(() => import("./pages/CuanDashboard"));
const Rewards       = lazy(() => import("./pages/Rewards"));
const Surveys       = lazy(() => import("./pages/Surveys"));
const Privacy       = lazy(() => import("./pages/Privacy"));
const Terms         = lazy(() => import("./pages/Terms"));
const PromoRules    = lazy(() => import("./pages/PromoRules"));
const Contact       = lazy(() => import("./pages/Contact"));
const NotFound      = lazy(() => import("./pages/NotFound"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const Admin         = lazy(() => import("./pages/Admin"));
const ReceiptHistory = lazy(() => import("./pages/ReceiptHistory"));

// Minimal dark spinner shown while a lazy page chunk is downloading
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0A0E1A]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#9b5cff] border-t-transparent" />
    </div>
  );
}

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
            {/* Single Suspense boundary — handles all lazy route chunks */}
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"            element={<Index />} />
                <Route path="/home"        element={<Navigate to="/" replace />} />
                <Route path="/radar"       element={<Map />} />
                <Route path="/map"         element={<Navigate to="/radar" replace />} />
                <Route path="/onboarding"  element={<Onboarding />} />
                <Route path="/promo"       element={<Promo />} />
                <Route path="/earn"        element={<EarnErrorBoundary><Earn /></EarnErrorBoundary>} />
                <Route path="/weekly-draw" element={<WeeklyDraw />} />
                <Route path="/invite"      element={<Invite />} />
                <Route path="/upload"      element={<Navigate to="/" replace />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/rank"        element={<Navigate to="/leaderboard" replace />} />
                <Route path="/settings"    element={<Settings />} />
                <Route path="/cuan"        element={<CuanDashboard />} />
                <Route path="/rewards"     element={<Rewards />} />
                <Route path="/surveys"     element={<Surveys />} />
                <Route path="/privacy"     element={<Privacy />} />
                <Route path="/terms"       element={<Terms />} />
                <Route path="/promo-rules" element={<PromoRules />} />
                <Route path="/contact"     element={<Contact />} />
                <Route path="/admin"       element={<Admin />} />
                <Route path="/receipts"    element={<ReceiptHistory />} />
                <Route path="*"            element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </RadarProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
