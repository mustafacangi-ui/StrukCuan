import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { UserProvider } from "@/contexts/UserContext";
import { RadarProvider } from "@/contexts/RadarContext";   // ⭐ BUNU EKLE

import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import { useUser } from "@/contexts/UserContext";

const AdminReceipts = lazy(() => import("./pages/AdminReceipts"));
const ReceiptHistory = lazy(() => import("./pages/ReceiptHistory"));

const queryClient = new QueryClient();

const AdminRoute = () => {
  const { user } = useUser();
  const adminPhones = ["+6281234567890"]; // TODO: replace with real admin numbers

  if (!user || !adminPhones.includes(user.phone)) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center px-4">
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
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/receipts" element={<AdminRoute />} />
              <Route
                path="/receipts"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center px-4">
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