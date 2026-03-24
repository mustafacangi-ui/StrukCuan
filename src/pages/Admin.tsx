import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Receipt, MapPin, LayoutDashboard } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUser } from "@/contexts/UserContext";
import AdminReceipts from "./AdminReceipts";
import AdminDeals from "./AdminDeals";

type Tab = "dashboard" | "receipts" | "deals";

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("auth.mustLogin")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground text-center">{t("admin.receipts.noAccess")}</p>
        <button
          onClick={() => navigate("/home")}
          className="mt-4 text-primary font-semibold hover:underline"
        >
          {t("admin.receipts.backHome")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-[900px] mx-auto pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">{t("admin.title")}</h1>
            <p className="text-[10px] text-muted-foreground">{t("admin.subtitle")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          <button
            onClick={() => setTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <LayoutDashboard size={16} />
            {t("admin.tabs.dashboard")}
          </button>
          <button
            onClick={() => setTab("receipts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "receipts" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Receipt size={16} />
            {t("admin.tabs.receipts")}
          </button>
          <button
            onClick={() => setTab("deals")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "deals" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <MapPin size={16} />
            {t("admin.tabs.deals")}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {tab === "dashboard" && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-display font-bold text-foreground mb-2">{t("auth.welcome")}</h2>
              <p className="text-sm text-muted-foreground">{t("admin.dashboard.intro")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTab("receipts")}
                className="rounded-xl border-2 border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Receipt size={24} className="text-primary mb-2" />
                <p className="font-semibold text-foreground">{t("admin.dashboard.receiptCardTitle")}</p>
                <p className="text-[10px] text-muted-foreground">{t("admin.dashboard.receiptCardDesc")}</p>
              </button>
              <button
                onClick={() => setTab("deals")}
                className="rounded-xl border-2 border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <MapPin size={24} className="text-red-500 mb-2" />
                <p className="font-semibold text-foreground">{t("admin.dashboard.dealCardTitle")}</p>
                <p className="text-[10px] text-muted-foreground">{t("admin.dashboard.dealCardDesc")}</p>
              </button>
            </div>
          </div>
        )}
        {tab === "receipts" && (
          <div className="p-4 pt-0">
            <AdminReceipts embedded />
          </div>
        )}
        {tab === "deals" && <AdminDeals />}
      </div>
    </div>
  );
}
