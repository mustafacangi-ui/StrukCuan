import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Receipt, MapPin, LayoutDashboard, Bell, Send, Sparkles, Ticket, MapPinned, CheckCircle, ScrollText } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import AdminReceipts from "./AdminReceipts";
import AdminDeals from "./AdminDeals";

type Tab = "dashboard" | "receipts" | "deals";

const NOTIFICATION_TEMPLATES = [
  { icon: Ticket, label: "Weekly draw", text: "Weekly draw today - collect more tickets now!" },
  { icon: Sparkles, label: "Daily shake", text: "Your daily shake is ready!" },
  { icon: ScrollText, label: "New surveys", text: "New surveys available now" },
  { icon: MapPinned, label: "Red label", text: "New nearby red label available" },
  { icon: CheckCircle, label: "Receipt approved", text: "Receipt approved - tickets added" },
];

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const [tab, setTab] = useState<Tab>("dashboard");

  // Push notification form state
  const [notifTitle, setNotifTitle] = useState("StrukCuan");
  const [notifBody, setNotifBody] = useState("");
  const [isSending, setIsSending] = useState(false);

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
              {Notification.permission === "granted" && (
                <div
                  className="col-span-2 rounded-xl border-2 p-4 text-left transition-colors"
                  style={{
                    borderColor: "rgba(155, 92, 255, 0.4)",
                    background: "rgba(155, 92, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Bell size={24} className="text-[#9b5cff] mb-2" />
                      <p className="font-semibold text-foreground">Push Notification Test</p>
                      <p className="text-[10px] text-muted-foreground">Send a browser push notification to this device</p>
                    </div>
                    <button
                      onClick={() => {
                        new Notification("StrukCuan", {
                          body: "Your daily shake is ready!",
                          icon: "/icon-192.png"
                        });
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #9b5cff 0%, #7c3aed 100%)",
                        boxShadow: "0 0 15px rgba(155, 92, 255, 0.4)",
                      }}
                    >
                      Send Test Notification
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Push Notification Card */}
              <div
                className="col-span-2 rounded-xl border-2 p-4 text-left transition-colors"
                style={{
                  borderColor: "rgba(155, 92, 255, 0.4)",
                  background: "linear-gradient(135deg, rgba(155, 92, 255, 0.08) 0%, rgba(124, 58, 237, 0.05) 100%)",
                }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                    style={{
                      background: "rgba(155, 92, 255, 0.2)",
                      border: "1px solid rgba(155, 92, 255, 0.3)",
                    }}
                  >
                    <Send size={20} className="text-[#9b5cff]" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Manual Push Notification</p>
                    <p className="text-[10px] text-muted-foreground">Send a custom notification to all subscribed devices</p>
                  </div>
                </div>

                {/* Title Input */}
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1.5 block">
                    Title
                  </label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Notification title..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#9b5cff]/50 focus:ring-1 focus:ring-[#9b5cff]/30 transition-all"
                    maxLength={100}
                  />
                </div>

                {/* Message Textarea */}
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1.5 block">
                    Message
                  </label>
                  <textarea
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    placeholder="Write your notification message..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#9b5cff]/50 focus:ring-1 focus:ring-[#9b5cff]/30 transition-all resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/40">
                      {notifBody.length}/500 characters
                    </span>
                  </div>
                </div>

                {/* Template Quick-fill Buttons */}
                <div className="mb-4">
                  <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-2 block">
                    Quick Templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NOTIFICATION_TEMPLATES.map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNotifBody(template.text)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-[#9b5cff]/20 hover:border-[#9b5cff]/40 transition-all"
                      >
                        <template.icon size={12} className="text-[#9b5cff]" />
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Area */}
                {notifBody.trim() && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-3">
                    <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-2 block">
                      Preview
                    </label>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b5cff] to-[#7c3aed] flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-xs">SC</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{notifTitle || "StrukCuan"}</p>
                        <p className="text-xs text-white/70 leading-relaxed">{notifBody}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={async () => {
                    if (!notifTitle.trim() || !notifBody.trim()) {
                      toast({
                        title: "Validation Error",
                        description: "Please fill in both title and message",
                        variant: "destructive",
                      });
                      return;
                    }

                    setIsSending(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      
                      const response = await fetch("/api/admin/send-push", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({
                          title: notifTitle.trim(),
                          body: notifBody.trim(),
                        }),
                      });

                      const result = await response.json();

                      if (result.success) {
                        toast({
                          title: "Notification sent successfully",
                          description: `Sent to ${result.subscription_count} subscribed devices`,
                        });
                        setNotifBody("");
                        setNotifTitle("StrukCuan");
                      } else {
                        toast({
                          title: "Failed to send",
                          description: result.message || "An error occurred",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Failed to send",
                        description: error instanceof Error ? error.message : "Network error",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSending(false);
                    }
                  }}
                  disabled={isSending || !notifTitle.trim() || !notifBody.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background: "linear-gradient(135deg, #9b5cff 0%, #7c3aed 100%)",
                    boxShadow: "0 0 20px rgba(155, 92, 255, 0.4)",
                  }}
                >
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send size={16} />
                      Send Notification
                    </span>
                  )}
                </button>
              </div>
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
