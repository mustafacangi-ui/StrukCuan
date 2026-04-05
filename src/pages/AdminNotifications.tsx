import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Send, Sparkles, Ticket, MapPinned, CheckCircle, ScrollText, Calendar, Clock, AlertTriangle, Info, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const SEGMENT_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "inactive_users", label: "Inactive users (3+ days)" },
  { value: "low_ticket_users", label: "Low ticket users (<5 tickets)" },
  { value: "indonesia_users", label: "Indonesia users" },
  { value: "survey_users", label: "Survey users" },
];

const NOTIFICATION_TEMPLATES = [
  { icon: Ticket, label: "Weekly draw", text: "Weekly draw today - collect more tickets now!" },
  { icon: Sparkles, label: "Daily shake", text: "Your daily shake is ready!" },
  { icon: ScrollText, label: "New surveys", text: "New surveys available now" },
  { icon: MapPinned, label: "Red label", text: "New nearby red label available" },
  { icon: CheckCircle, label: "Receipt approved", text: "Receipt approved - tickets added" },
];

export default function AdminNotifications() {
  const { toast } = useToast();

  const [notifTitle, setNotifTitle] = useState("StrukCuan");
  const [notifBody, setNotifBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [scheduledTitle, setScheduledTitle] = useState("StrukCuan");
  const [scheduledBody, setScheduledBody] = useState("");
  const [scheduledSegment, setScheduledSegment] = useState("all");
  const [scheduledFor, setScheduledFor] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  const [isRunningScheduled, setIsRunningScheduled] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [lastRunResult, setLastRunResult] = useState<{
    notifications_processed: number;
    subscriptions_targeted: number;
    successful_sends: number;
    failed_sends: number;
  } | null>(null);

  useEffect(() => {
    fetchScheduledNotifications();
  }, []);

  const fetchScheduledNotifications = async () => {
    setIsLoadingScheduled(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_push_notifications")
        .select("*")
        .order("scheduled_for", { ascending: false });

      if (!error) {
        setScheduledNotifications(data || []);
      }
    } catch (error) {
      console.error("Error fetching scheduled notifications:", error);
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  const handleSendInstant = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast({ title: "Validation Error", description: "Fill all fields", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ title: notifTitle.trim(), body: notifBody.trim() }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Sent successfully", description: `Sent to ${result.total} devices.` });
        setNotifBody("");
        setNotifTitle("StrukCuan");
      } else throw new Error(result.message);
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleNotification = async () => {
    if (!scheduledTitle.trim() || !scheduledBody.trim() || !scheduledFor) {
      toast({ title: "Validation Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    setIsScheduling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/schedule-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          title: scheduledTitle.trim(),
          body: scheduledBody.trim(),
          segment: scheduledSegment,
          scheduled_for: new Date(scheduledFor).toISOString(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Scheduled successfully", description: `For ${new Date(scheduledFor).toLocaleString()}` });
        setScheduledBody(""); setScheduledTitle("StrukCuan"); setScheduledSegment("all"); setScheduledFor("");
        fetchScheduledNotifications();
      } else throw new Error(result.message);
    } catch (error: any) {
      toast({ title: "Failed to schedule", description: error.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRunScheduledNotifications = async () => {
    setIsRunningScheduled(true);
    try {
      const response = await fetch("/api/cron/send-scheduled-push");
      const result = await response.json();
      if (result.success) {
        setLastRunTime(new Date());
        setLastRunResult({
          notifications_processed: result.notifications_processed,
          subscriptions_targeted: result.subscriptions_targeted,
          successful_sends: result.successful_sends,
          failed_sends: result.failed_sends,
        });
        toast({ title: "Cron triggered", description: `Processed ${result.notifications_processed}` });
        fetchScheduledNotifications();
      } else throw new Error(result.message);
    } catch (error: any) {
      toast({ title: "Failed to run", description: error.message, variant: "destructive" });
    } finally {
      setIsRunningScheduled(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="p-4 space-y-4 max-w-2xl mx-auto"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Instant Notification Card */}
        <motion.div 
          className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 shrink-0">
              <Send size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-white/90 text-sm">Instant Broadcast</p>
              <p className="text-[10px] text-zinc-400">Send immediately to all</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-2xl border-none bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="Message body"
                rows={3}
                className="w-full rounded-2xl border-none bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {NOTIFICATION_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setNotifBody(tmpl.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium text-zinc-300 bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
                >
                  <tmpl.icon size={10} />
                  {tmpl.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSendInstant}
              disabled={isSending || !notifTitle || !notifBody}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              {isSending ? <div className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full"/> : <Send size={16} />}
              Send Now
            </button>
          </div>
        </motion.div>

        {/* Scheduled Card */}
        <motion.div 
          className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <Calendar size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white/90 text-sm">Schedule Push</p>
              <p className="text-[10px] text-zinc-400">Target segments for later</p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={scheduledTitle}
              onChange={(e) => setScheduledTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-2xl border-none bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            <textarea
              value={scheduledBody}
              onChange={(e) => setScheduledBody(e.target.value)}
              placeholder="Message body"
              rows={2}
              className="w-full rounded-2xl border-none bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <select
                value={scheduledSegment}
                onChange={(e) => setScheduledSegment(e.target.value)}
                className="w-full rounded-xl border-none bg-black/40 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none"
              >
                {SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-xl border-none bg-black/40 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>

            <button
              onClick={handleScheduleNotification}
              disabled={isScheduling || !scheduledTitle || !scheduledBody || !scheduledFor}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
            >
              {isScheduling ? <div className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full"/> : <Calendar size={16} />}
              Schedule
            </button>
          </div>
        </motion.div>

        {/* Status Card */}
        <motion.div 
          className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-500/10 border border-zinc-500/20 shrink-0">
                <Clock size={18} className="text-zinc-400" />
              </div>
              <div>
                <p className="font-semibold text-white/90 text-sm">Cron Queue</p>
                <p className="text-[10px] text-zinc-400">{scheduledNotifications.length} items scheduled</p>
              </div>
            </div>
            <button
              onClick={handleRunScheduledNotifications}
              disabled={isRunningScheduled}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isRunningScheduled ? <div className="animate-spin h-3 w-3 border-2 border-white/40 border-t-white rounded-full"/> : <Play size={12} />}
              Force Run Next
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {isLoadingScheduled ? (
              <p className="text-xs text-zinc-500 text-center py-4">Loading queue...</p>
            ) : scheduledNotifications.length > 0 ? (
              scheduledNotifications.map((notif) => (
                <div key={notif.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                   <div className="min-w-0 flex-1">
                     <p className="text-xs font-semibold text-white/80 truncate">{notif.title}</p>
                     <p className="text-[10px] text-zinc-500 truncate mt-0.5">{new Date(notif.scheduled_for).toLocaleString()}</p>
                   </div>
                   <span className={`px-2 py-1 flex-shrink-0 text-[9px] font-bold uppercase rounded-lg ${notif.sent ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                     {notif.sent ? "Sent" : "Pending"}
                   </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 text-center py-4">No scheduled notifications</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
