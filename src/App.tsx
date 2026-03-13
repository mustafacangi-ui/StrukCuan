import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { UserProvider } from "@/contexts/UserContext";
import { RadarProvider } from "@/contexts/RadarContext";   // ⭐ BUNU EKLE

import Index from "./pages/Index";
import PostLoginRedirect from "./components/PostLoginRedirect";
import ReferralCapture from "./components/ReferralCapture";
import Promo from "./pages/Promo";
import Invite from "./pages/Invite";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PromoRules from "./pages/PromoRules";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import { useUser } from "@/contexts/UserContext";

const AdminReceipts = lazy(() => import("./pages/AdminReceipts"));
const ReceiptHistory = lazy(() => import("./pages/ReceiptHistory"));

const queryClient = new QueryClient();

const AdminRoute = () => {
  const { user } = useUser();
  const adminIds = (import.meta.env.VITE_ADMIN_IDS ?? "").split(",").filter(Boolean);

  if (!user || !adminIds.includes(user.id)) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background max-w-[420px] mx-auto flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Loading admin page...</p>
        </div>
      }
    >
      <AdminReceipts />
    </Suspense>
  );
};

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
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/promo" element={<Promo />} />
              <Route path="/invite" element={<Invite />} />
              <Route path="/upload" element={<Navigate to="/" replace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/promo-rules" element={<PromoRules />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin/receipts" element={<AdminRoute />} />
              <Route
                path="/receipts"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex items-center justify-center px-4">
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