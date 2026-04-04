import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Receipt, MapPin, LayoutDashboard, Bell, Send, Sparkles, Ticket, MapPinned, CheckCircle, ScrollText, Calendar, Clock, AlertTriangle, Info, Play } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import AdminReceipts from "./AdminReceipts";
import AdminDeals from "./AdminDeals";

// Segment options for scheduled push notifications
const SEGMENT_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "inactive_users", label: "Inactive users (3+ days)" },
  { value: "low_ticket_users", label: "Low ticket users (<5 tickets)" },
  { value: "indonesia_users", label: "Indonesia users" },
  { value: "survey_users", label: "Survey users" },
];

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

  // Scheduled push notification form state
  const [scheduledTitle, setScheduledTitle] = useState("StrukCuan");
  const [scheduledBody, setScheduledBody] = useState("");
  const [scheduledSegment, setScheduledSegment] = useState("all");
  const [scheduledFor, setScheduledFor] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  // Manual run scheduled notifications state
  const [isRunningScheduled, setIsRunningScheduled] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [lastRunResult, setLastRunResult] = useState<{
    notifications_processed: number;
    subscriptions_targeted: number;
    successful_sends: number;
    failed_sends: number;
  } | null>(null);

  // Fetch scheduled notifications
  useEffect(() => {
    if (isAdmin) {
      fetchScheduledNotifications();
    }
  }, [isAdmin]);

  const fetchScheduledNotifications = async () => {
    setIsLoadingScheduled(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_push_notifications")
        .select("*")
        .order("scheduled_for", { ascending: false });

      if (error) {
        console.error("Failed to fetch scheduled notifications:", error);
      } else {
        setScheduledNotifications(data || []);
      }
    } catch (error) {
      console.error("Error fetching scheduled notifications:", error);
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  const handleScheduleNotification = async () => {
    if (!scheduledTitle.trim() || !scheduledBody.trim() || !scheduledFor) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsScheduling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch("/api/admin/schedule-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: scheduledTitle.trim(),
          body: scheduledBody.trim(),
          segment: scheduledSegment,
          scheduled_for: new Date(scheduledFor).toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Notification scheduled successfully",
          description: `Scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        });
        setScheduledBody("");
        setScheduledTitle("StrukCuan");
        setScheduledSegment("all");
        setScheduledFor("");
        // Refresh the list
        fetchScheduledNotifications();
      } else {
        toast({
          title: "Failed to schedule",
          description: result.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to schedule",
        description: error instanceof Error ? error.message : "Network error",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRunScheduledNotifications = async () => {
    setIsRunningScheduled(true);
    try {
      const response = await fetch("/api/cron/send-scheduled-push", {
        method: "GET",
      });

      const result = await response.json();

      if (result.success) {
        setLastRunTime(new Date());
        setLastRunResult({
          notifications_processed: result.notifications_processed,
          subscriptions_targeted: result.subscriptions_targeted,
          successful_sends: result.successful_sends,
          failed_sends: result.failed_sends,
        });
        toast({
          title: "Scheduled notifications processed",
          description: `Processed ${result.notifications_processed} notifications, ${result.successful_sends} successful sends`,
        });
        // Refresh the list to show updated sent status
        fetchScheduledNotifications();
      } else {
        toast({
          title: "Failed to run scheduled notifications",
          description: result.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to run scheduled notifications",
        description: error instanceof Error ? error.message : "Network error",
        variant: "destructive",
      });
    } finally {
      setIsRunningScheduled(false);
    }
  };

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
                          description: `Sent to ${result.total} subscribed devices (${result.successful} successful, ${result.failed} failed)`,
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

              {/* Scheduled Push Notification Card */}
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
                    <Calendar size={20} className="text-[#9b5cff]" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Scheduled Push Notification</p>
                    <p className="text-[10px] text-muted-foreground">Schedule a push notification for later</p>
                  </div>
                </div>

                {/* Title Input */}
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1.5 block">
                    Title
                  </label>
                  <input
                    type="text"
                    value={scheduledTitle}
                    onChange={(e) => setScheduledTitle(e.target.value)}
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
                    value={scheduledBody}
                    onChange={(e) => setScheduledBody(e.target.value)}
                    placeholder="Write your notification message..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#9b5cff]/50 focus:ring-1 focus:ring-[#9b5cff]/30 transition-all resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/40">
                      {scheduledBody.length}/500 characters
                    </span>
                  </div>
                </div>

                {/* Segment Dropdown */}
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1.5 block">
                    Target Segment
                  </label>
                  <select
                    value={scheduledSegment}
                    onChange={(e) => setScheduledSegment(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#9b5cff]/50 focus:ring-1 focus:ring-[#9b5cff]/30 transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                    }}
                  >
                    {SEGMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#1a1a2e] text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date/Time Picker */}
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1.5 block">
                    Schedule Date & Time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        console.log("[Admin] scheduledFor changed:", newValue);
                        setScheduledFor(newValue);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#9b5cff]/50 focus:ring-1 focus:ring-[#9b5cff]/30 transition-all"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Timezone Helper - Shows when datetime is selected */}
                {scheduledFor && (
                  <div className="mb-3 rounded-xl border border-[#9b5cff]/30 bg-[#9b5cff]/10 p-3">
                    <label className="text-[10px] font-medium text-[#9b5cff] uppercase tracking-wider mb-2 block">
                      Timezone Preview
                    </label>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 w-16 shrink-0">Local:</span>
                        <span className="text-white font-medium">
                          {new Date(scheduledFor).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 w-16 shrink-0">Jakarta:</span>
                        <span className="text-white font-medium">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: "Asia/Jakarta",
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(scheduledFor))}
                          <span className="text-white/60 ml-1">WIB</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 w-16 shrink-0">Germany:</span>
                        <span className="text-white font-medium">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: "Europe/Berlin",
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(scheduledFor))}
                          <span className="text-white/60 ml-1">CET</span>
                        </span>
                      </div>
                    </div>

                    {/* Sleeping Hours Warning */}
                    {(() => {
                      const jakartaDate = new Date(
                        new Date(scheduledFor).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
                      );
                      const jakartaHour = jakartaDate.getHours();
                      const isSleepingHours = jakartaHour >= 22 || jakartaHour < 7;

                      if (isSleepingHours) {
                        return (
                          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                            <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-yellow-200">
                              Warning: This notification may be sent during sleeping hours in Indonesia
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Info Box */}
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#9b5cff]/20 bg-black/20 px-3 py-2">
                      <Info size={14} className="text-[#9b5cff] shrink-0 mt-0.5" />
                      <span className="text-[10px] text-white/60">
                        Scheduled notifications should avoid 22:00 - 07:00 WIB
                      </span>
                    </div>
                  </div>
                )}

                {/* Schedule Button */}
                <button
                  onClick={handleScheduleNotification}
                  disabled={isScheduling || !scheduledTitle.trim() || !scheduledBody.trim() || !scheduledFor}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mb-4"
                  style={{
                    background: "linear-gradient(135deg, #9b5cff 0%, #7c3aed 100%)",
                    boxShadow: "0 0 20px rgba(155, 92, 255, 0.4)",
                  }}
                >
                  {isScheduling ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Scheduling...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Calendar size={16} />
                      Schedule Notification
                    </span>
                  )}
                </button>

                {/* Scheduled Notifications List */}
                {isLoadingScheduled ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#9b5cff] border-t-transparent" />
                  </div>
                ) : scheduledNotifications.length > 0 ? (
                  <div className="border-t border-white/10 pt-4">
                    <label className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-3 block">
                      Scheduled Notifications ({scheduledNotifications.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scheduledNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-start justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-white/50 mt-0.5">
                              {SEGMENT_OPTIONS.find((o) => o.value === notification.segment)?.label || notification.segment}
                            </p>
                            <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(notification.scheduled_for).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                              notification.sent
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            }`}
                          >
                            {notification.sent ? "Sent" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-[10px] text-white/40 text-center">
                      No scheduled notifications yet
                    </p>
                  </div>
                )}

                {/* Run Scheduled Notifications Section */}
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                      style={{
                        background: "rgba(155, 92, 255, 0.2)",
                        border: "1px solid rgba(155, 92, 255, 0.3)",
                      }}
                    >
                      <Play size={20} className="text-[#9b5cff]" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Run Scheduled Notifications</p>
                      <p className="text-[10px] text-muted-foreground">Manually trigger pending scheduled push notifications now</p>
                    </div>
                  </div>

                  {/* Run Button */}
                  <button
                    onClick={handleRunScheduledNotifications}
                    disabled={isRunningScheduled}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mb-3"
                    style={{
                      background: "linear-gradient(135deg, #9b5cff 0%, #7c3aed 100%)",
                      boxShadow: "0 0 20px rgba(155, 92, 255, 0.4)",
                    }}
                  >
                    {isRunningScheduled ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Running...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Play size={16} />
                        Run Scheduled Notifications Now
                      </span>
                    )}
                  </button>

                  {/* Last Run Summary */}
                  {lastRunTime && lastRunResult && (
                    <div className="rounded-xl border border-[#9b5cff]/30 bg-[#9b5cff]/10 p-3">
                      <label className="text-[10px] font-medium text-[#9b5cff] uppercase tracking-wider mb-2 block">
                        Last Run Summary
                      </label>
                      <p className="text-[10px] text-white/60 mb-2">
                        {lastRunTime.toLocaleString()}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/50">Notifications processed:</span>
                          <span className="text-white font-medium">{lastRunResult.notifications_processed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Subscriptions targeted:</span>
                          <span className="text-white font-medium">{lastRunResult.subscriptions_targeted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Successful sends:</span>
                          <span className="text-green-400 font-medium">{lastRunResult.successful_sends}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Failed sends:</span>
                          <span className={lastRunResult.failed_sends > 0 ? "text-red-400 font-medium" : "text-white/70 font-medium"}>
                            {lastRunResult.failed_sends}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
