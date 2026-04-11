import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Bell, Send, Calendar, Clock, History, Trash2, Globe, AlertTriangle,
  ChevronDown, ChevronUp, Eye, EyeOff, Play, Search, ToggleLeft,
  ToggleRight, Zap, RefreshCw, Users, Filter, CheckCircle2, X,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "instant" | "schedule" | "templates" | "queue" | "history";

interface PushTemplate {
  id: string;
  template_key: string;
  name: string;
  title: string;
  body: string;
  schedule_hour_wib: number;
  schedule_days: string;
  audience: string;
  enabled: boolean;
  last_sent_at: string | null;
  updated_at: string;
}

interface ScheduledPush {
  id: string;
  title: string;
  body: string;
  segment: string;
  scheduled_for: string;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { value: "all",            label: "All Users",             desc: "Every subscribed device" },
  { value: "active_today",   label: "Active Today",          desc: "Uploaded a receipt today" },
  { value: "inactive_today", label: "Inactive Today",        desc: "No activity today" },
  { value: "inactive_users", label: "Inactive 3+ Days",      desc: "No upload in last 3 days" },
  { value: "zero_entries",   label: "0 Entries",             desc: "Less than 10 tickets" },
  { value: "has_entries",    label: "Has Entries",           desc: "10+ tickets (≥1 entry)" },
  { value: "almost_entry",   label: "Almost Next Entry",     desc: "8–9 tickets toward next entry" },
  { value: "low_ticket_users", label: "Low Tickets",         desc: "Fewer than 5 tickets" },
  { value: "pending_surveys",  label: "Pending Surveys",     desc: "No survey in last 7 days" },
  { value: "near_red_label",   label: "Near Red Label",      desc: "Users near shared deals" },
  { value: "indonesia_users",  label: "Indonesia Only",      desc: "Country = ID" },
  { value: "survey_users",     label: "Survey Completers",   desc: "Completed at least one survey" },
];

const SCHEDULE_DAYS_OPTIONS = [
  { value: "daily",   label: "Every day" },
  { value: "weekday", label: "Weekdays only (Mon–Fri)" },
  { value: "weekend", label: "Weekends only (Sat–Sun)" },
  { value: "sunday",  label: "Sundays only" },
];

const QUICK_TEMPLATES = [
  { category: "Draw", items: [
    { title: "StrukCuan — Draw Day! 🎟️", text: "Today is draw day. Complete your tasks before tonight's draw at 21:00 WIB." },
    { title: "StrukCuan — Last Chance! ⏳", text: "Only hours until the weekly draw! Last chance to earn tickets before 21:00 WIB." },
    { title: "StrukCuan — Draw Results 🏆", text: "This week's draw winners are announced! Check if your draw code won." },
  ]},
  { category: "Engagement", items: [
    { title: "StrukCuan", text: "Have you completed today's tasks? Earn your tickets now." },
    { title: "StrukCuan", text: "Don't forget to scan your receipts today! Every receipt = 1 ticket." },
    { title: "StrukCuan — Almost There!", text: "Only 1–2 more tickets needed for your next draw entry. Keep scanning!" },
  ]},
  { category: "Surveys", items: [
    { title: "StrukCuan — New Survey", text: "A new survey is waiting for you. Complete it now and earn bonus tickets!" },
  ]},
  { category: "Promos", items: [
    { title: "StrukCuan — 🔴 Deal Nearby", text: "A red label deal was just shared near you. Check it out and share yours too!" },
  ]},
];

const TEMPLATE_ICONS: Record<string, string> = {
  daily_noon: "☀️",
  evening_reminder: "🌙",
  sunday_draw_reminder: "🎟️",
  final_draw_countdown: "⏳",
  new_survey: "📋",
  red_label_nearby: "🔴",
  almost_next_entry: "🎯",
  winner_announcement: "🏆",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isSleepingHours(dateStr: string): boolean {
  if (!dateStr) return false;
  const h = parseInt(
    new Date(dateStr).toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }),
    10
  );
  return h >= 22 || h < 7;
}

function toWIB(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function segmentLabel(value: string): string {
  return SEGMENTS.find((s) => s.value === value)?.label ?? value;
}

function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00 WIB`;
}

function scheduleDaysLabel(v: string): string {
  return SCHEDULE_DAYS_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Notification Preview bubble
// ─────────────────────────────────────────────────────────────────────────────

function NotifPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-3 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-purple-600/40 border border-purple-500/30 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-purple-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white truncate">{title || "Title"}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">{body || "Body text…"}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Segment Select
// ─────────────────────────────────────────────────────────────────────────────

function SegmentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
        <Users size={10} className="inline mr-1" />Audience
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border-none bg-black/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 appearance-none"
      >
        {SEGMENTS.map((s) => (
          <option key={s.value} value={s.value} className="bg-zinc-900">
            {s.label} — {s.desc}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<Tab>("instant");

  // Instant
  const [instTitle, setInstTitle]     = useState("StrukCuan");
  const [instBody, setInstBody]       = useState("");
  const [instSegment, setInstSegment] = useState("all");
  const [isSending, setIsSending]     = useState(false);
  const [showInstPreview, setShowInstPreview] = useState(false);

  // Schedule
  const [schedTitle, setSchedTitle]     = useState("StrukCuan");
  const [schedBody, setSchedBody]       = useState("");
  const [schedSegment, setSchedSegment] = useState("all");
  const [schedFor, setSchedFor]         = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [showSchedPreview, setShowSchedPreview] = useState(false);

  // Templates
  const [templates, setTemplates]           = useState<PushTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [expandedTemplate, setExpandedTemplate]     = useState<string | null>(null);
  const [tplEdits, setTplEdits]             = useState<Record<string, Partial<PushTemplate>>>({});
  const [savingTpl, setSavingTpl]           = useState<string | null>(null);
  const [togglingTpl, setTogglingTpl]       = useState<string | null>(null);
  const [sendingTpl, setSendingTpl]         = useState<string | null>(null);

  // Queue
  const [queue, setQueue]               = useState<ScheduledPush[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueSearch, setQueueSearch]   = useState("");

  // History
  const [history, setHistory]               = useState<ScheduledPush[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [histSearch, setHistSearch]         = useState("");
  const [histSegFilter, setHistSegFilter]   = useState("all");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("push_notification_templates")
        .select("*")
        .order("schedule_hour_wib", { ascending: true });
      if (!error && data) setTemplates(data);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const { data } = await supabase
        .from("scheduled_push_notifications")
        .select("*")
        .eq("sent", false)
        .order("scheduled_for", { ascending: true });
      setQueue(data ?? []);
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("scheduled_push_notifications")
        .select("*")
        .eq("sent", true)
        .order("sent_at", { ascending: false })
        .limit(100);
      setHistory(data ?? []);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchQueue();
    fetchHistory();
  }, [fetchTemplates, fetchQueue, fetchHistory]);

  // ── Shared auth helper ─────────────────────────────────────────────────────

  async function getAuthHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
  }

  // ── Instant send ───────────────────────────────────────────────────────────

  async function handleSendInstant() {
    if (!instTitle.trim() || !instBody.trim()) {
      toast.error("Fill in title and body");
      return;
    }
    setIsSending(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/send-push", {
        method: "POST", headers,
        body: JSON.stringify({ title: instTitle.trim(), body: instBody.trim(), segment: instSegment }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Sent to ${json.successful}/${json.total} devices`);
        setInstBody(""); setInstTitle("StrukCuan"); setInstSegment("all");
        setShowInstPreview(false);
        fetchHistory();
      } else {
        toast.error(json.message ?? "Send failed");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Network error");
    } finally {
      setIsSending(false);
    }
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  async function handleSchedule() {
    if (!schedTitle.trim() || !schedBody.trim() || !schedFor) {
      toast.error("Fill in all fields including date/time");
      return;
    }
    if (new Date(schedFor) <= new Date()) {
      toast.error("Schedule must be in the future");
      return;
    }
    setIsScheduling(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/schedule-push", {
        method: "POST", headers,
        body: JSON.stringify({
          title: schedTitle.trim(), body: schedBody.trim(),
          segment: schedSegment, scheduled_for: new Date(schedFor).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Scheduled for ${toWIB(schedFor)} WIB`);
        setSchedBody(""); setSchedTitle("StrukCuan"); setSchedSegment("all"); setSchedFor("");
        setShowSchedPreview(false);
        setActiveTab("queue");
        fetchQueue();
      } else {
        toast.error(json.message ?? "Failed to schedule");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Network error");
    } finally {
      setIsScheduling(false);
    }
  }

  // ── Delete from queue ──────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const { error } = await supabase.from("scheduled_push_notifications").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    fetchQueue();
    fetchHistory();
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  function getTplField<K extends keyof PushTemplate>(tpl: PushTemplate, field: K): PushTemplate[K] {
    return (tplEdits[tpl.id]?.[field] ?? tpl[field]) as PushTemplate[K];
  }

  function setTplEdit(id: string, field: keyof PushTemplate, value: any) {
    setTplEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveTemplate(tpl: PushTemplate) {
    const edits = tplEdits[tpl.id];
    if (!edits || Object.keys(edits).length === 0) return;
    setSavingTpl(tpl.id);
    try {
      const { error } = await supabase
        .from("push_notification_templates")
        .update(edits)
        .eq("id", tpl.id);
      if (error) throw error;
      toast.success(`Template "${tpl.name}" saved`);
      setTplEdits((prev) => { const n = { ...prev }; delete n[tpl.id]; return n; });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingTpl(null);
    }
  }

  async function toggleTemplate(tpl: PushTemplate) {
    setTogglingTpl(tpl.id);
    try {
      const { error } = await supabase
        .from("push_notification_templates")
        .update({ enabled: !tpl.enabled })
        .eq("id", tpl.id);
      if (error) throw error;
      toast.success(`"${tpl.name}" ${!tpl.enabled ? "enabled" : "disabled"}`);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTogglingTpl(null);
    }
  }

  async function sendTemplateNow(tpl: PushTemplate) {
    setSendingTpl(tpl.id);
    try {
      const headers = await getAuthHeader();
      const title = getTplField(tpl, "title") as string;
      const body  = getTplField(tpl, "body")  as string;
      const audience = getTplField(tpl, "audience") as string;
      const res = await fetch("/api/admin/send-push", {
        method: "POST", headers,
        body: JSON.stringify({ title, body, segment: audience }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`"${tpl.name}" sent to ${json.successful}/${json.total} devices`);
        // Update last_sent_at in DB
        await supabase
          .from("push_notification_templates")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", tpl.id);
        fetchTemplates();
      } else {
        toast.error(json.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingTpl(null);
    }
  }

  // Apply a quick template to the active compose form
  function applyQuickTemplate(item: { title: string; text: string }) {
    if (activeTab === "instant") {
      setInstTitle(item.title); setInstBody(item.text);
    } else if (activeTab === "schedule") {
      setSchedTitle(item.title); setSchedBody(item.text);
    }
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredQueue = queue.filter((n) =>
    !queueSearch ||
    n.title.toLowerCase().includes(queueSearch.toLowerCase()) ||
    n.body.toLowerCase().includes(queueSearch.toLowerCase())
  );

  const filteredHistory = history.filter((n) => {
    const matchSearch = !histSearch ||
      n.title.toLowerCase().includes(histSearch.toLowerCase()) ||
      n.body.toLowerCase().includes(histSearch.toLowerCase());
    const matchSeg = histSegFilter === "all" || n.segment === histSegFilter;
    return matchSearch && matchSeg;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Compose panel (shared by Instant + Schedule tabs)
  // ─────────────────────────────────────────────────────────────────────────

  function ComposePanel({
    mode,
  }: { mode: "instant" | "schedule" }) {
    const isInstant = mode === "instant";
    const title      = isInstant ? instTitle : schedTitle;
    const body       = isInstant ? instBody : schedBody;
    const segment    = isInstant ? instSegment : schedSegment;
    const setTitle   = isInstant ? setInstTitle : setSchedTitle;
    const setBody    = isInstant ? setInstBody : setSchedBody;
    const setSegment = isInstant ? setInstSegment : setSchedSegment;
    const showPrev   = isInstant ? showInstPreview : showSchedPreview;
    const setShowPrev = isInstant ? setShowInstPreview : setShowSchedPreview;

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Editor */}
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl border shrink-0 flex items-center justify-center ${isInstant ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
              {isInstant ? <Send size={17} /> : <Calendar size={17} />}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{isInstant ? "Instant Broadcast" : "Schedule Push"}</p>
              <p className="text-[10px] text-zinc-500">{isInstant ? "Delivered immediately to target segment" : "Queued and fired by hourly cron"}</p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Notification title"
              className="w-full rounded-2xl bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
            <p className="text-right text-[9px] text-zinc-600 mt-0.5">{title.length}/100</p>
          </div>

          {/* Body */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Notification body text…"
              className="w-full rounded-2xl bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 resize-none"
            />
            <p className="text-right text-[9px] text-zinc-600 mt-0.5">{body.length}/500</p>
          </div>

          {/* Audience */}
          <SegmentSelect value={segment} onChange={setSegment} />

          {/* Schedule-only fields */}
          {!isInstant && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
                  <Clock size={10} className="inline mr-1" />Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={schedFor}
                  onChange={(e) => setSchedFor(e.target.value)}
                  className="w-full rounded-2xl bg-black/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
                />
              </div>

              {schedFor && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Globe size={10} /> Timezone
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Device local</span>
                      <span className="font-mono text-zinc-300">{new Date(schedFor).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Jakarta (WIB)</span>
                      <span className="font-mono text-emerald-400">{toWIB(schedFor)}</span>
                    </div>
                  </div>
                  {isSleepingHours(schedFor) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2">
                      <AlertTriangle size={11} /> Targets Indonesian sleeping hours (22:00–07:00 WIB)
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Preview toggle */}
          <button
            onClick={() => setShowPrev(!showPrev)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPrev ? <EyeOff size={11} /> : <Eye size={11} />}
            {showPrev ? "Hide Preview" : "Preview Notification"}
          </button>
          <AnimatePresence>
            {showPrev && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <NotifPreview title={title} body={body} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action button */}
          <div className="pt-2">
            {isInstant ? (
              <button
                onClick={handleSendInstant}
                disabled={isSending || !instTitle.trim() || !instBody.trim()}
                className="w-full py-3.5 flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white text-sm shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
              >
                {isSending ? <><RefreshCw size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send Immediately</>}
              </button>
            ) : (
              <button
                onClick={handleSchedule}
                disabled={isScheduling || !schedTitle.trim() || !schedBody.trim() || !schedFor}
                className="w-full py-3.5 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white text-sm shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all"
              >
                {isScheduling ? <><RefreshCw size={15} className="animate-spin" /> Saving…</> : <><Calendar size={15} /> Lock Schedule</>}
              </button>
            )}
          </div>
        </div>

        {/* Quick Template Sidebar */}
        <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-4 overflow-y-auto max-h-[620px]">
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <Zap size={12} className="text-yellow-400" /> Quick Templates
          </h3>
          <div className="space-y-4">
            {QUICK_TEMPLATES.map((group) => (
              <div key={group.category}>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1.5">{group.category}</p>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => applyQuickTemplate(item)}
                      className="text-left px-3 py-2.5 rounded-xl border border-white/5 bg-black/30 hover:bg-white/10 hover:border-white/10 transition-all"
                    >
                      <p className="text-[11px] font-semibold text-zinc-300 leading-snug line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2 mt-0.5">{item.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "instant",   label: "Instant",   icon: <Send size={12} /> },
    { id: "schedule",  label: "Schedule",  icon: <Calendar size={12} /> },
    { id: "templates", label: "Templates", icon: <Bell size={12} /> },
    { id: "queue",     label: "Queue",     icon: <Clock size={12} />, badge: queue.length || undefined },
    { id: "history",   label: "History",   icon: <History size={12} /> },
  ];

  return (
    <div className="space-y-5 pb-24">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === t.id
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Instant ── */}
        {activeTab === "instant" && (
          <motion.div key="instant" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ComposePanel mode="instant" />
          </motion.div>
        )}

        {/* ── Schedule ── */}
        {activeTab === "schedule" && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ComposePanel mode="schedule" />
          </motion.div>
        )}

        {/* ── Templates ── */}
        {activeTab === "templates" && (
          <motion.div key="templates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Automated Templates</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Enabled templates fire automatically via hourly cron. Edit title/body/schedule, then toggle on.
                </p>
              </div>
              <button onClick={fetchTemplates} className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-zinc-400 transition-colors">
                <RefreshCw size={13} className={isLoadingTemplates ? "animate-spin" : ""} />
              </button>
            </div>

            {isLoadingTemplates && templates.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <Bell size={28} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-white font-semibold text-sm mb-1">No templates found</p>
                <p className="text-zinc-500 text-xs">Run <code className="bg-black/40 px-1 rounded">push_notification_templates_migration.sql</code> in Supabase to seed defaults.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {templates.map((tpl) => {
                  const isExpanded = expandedTemplate === tpl.id;
                  const hasEdits   = !!(tplEdits[tpl.id] && Object.keys(tplEdits[tpl.id]).length > 0);
                  const tTitle     = getTplField(tpl, "title") as string;
                  const tBody      = getTplField(tpl, "body")  as string;
                  const tHour      = getTplField(tpl, "schedule_hour_wib") as number;
                  const tDays      = getTplField(tpl, "schedule_days")     as string;
                  const tAudience  = getTplField(tpl, "audience")          as string;

                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-3xl border transition-all overflow-hidden ${
                        tpl.enabled
                          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                          : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      {/* Card header */}
                      <div className="p-4 flex items-start gap-3">
                        <span className="text-2xl shrink-0">{TEMPLATE_ICONS[tpl.template_key] ?? "📣"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-white truncate">{tpl.name}</p>
                            {/* Enable/Disable toggle */}
                            <button
                              onClick={() => toggleTemplate(tpl)}
                              disabled={togglingTpl === tpl.id}
                              title={tpl.enabled ? "Disable" : "Enable"}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border transition-all shrink-0 ${
                                tpl.enabled
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-white/5 border-white/10 text-zinc-500 hover:border-white/20"
                              }`}
                            >
                              {tpl.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                              {tpl.enabled ? "ON" : "OFF"}
                            </button>
                          </div>
                          {/* Badges */}
                          <div className="flex flex-wrap gap-1 text-[9px]">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-300 font-bold">
                              {hourLabel(tpl.schedule_hour_wib)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-300 font-bold">
                              {scheduleDaysLabel(tpl.schedule_days)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-zinc-500/15 border border-zinc-500/20 text-zinc-400 font-bold">
                              {segmentLabel(tpl.audience)}
                            </span>
                          </div>
                          {tpl.last_sent_at && (
                            <p className="text-[9px] text-zinc-600 mt-1.5">
                              Last fired: {toWIB(tpl.last_sent_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="px-4 pb-3 flex items-center gap-2">
                        <button
                          onClick={() => sendTemplateNow(tpl)}
                          disabled={sendingTpl === tpl.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          {sendingTpl === tpl.id ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                          Send Now
                        </button>
                        <button
                          onClick={() => setExpandedTemplate(isExpanded ? null : tpl.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 text-[10px] font-bold transition-all"
                        >
                          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {isExpanded ? "Collapse" : "Edit"}
                        </button>
                        {hasEdits && (
                          <button
                            onClick={() => saveTemplate(tpl)}
                            disabled={savingTpl === tpl.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-all ml-auto"
                          >
                            {savingTpl === tpl.id ? <RefreshCw size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                            Save
                          </button>
                        )}
                      </div>

                      {/* Expandable editor */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-white/5"
                          >
                            <div className="p-4 space-y-3 bg-black/20">
                              {/* Title */}
                              <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 block mb-1">Title</label>
                                <input
                                  type="text"
                                  value={tTitle}
                                  onChange={(e) => setTplEdit(tpl.id, "title", e.target.value)}
                                  maxLength={100}
                                  className="w-full rounded-xl bg-black/50 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                                />
                              </div>
                              {/* Body */}
                              <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 block mb-1">Body</label>
                                <textarea
                                  value={tBody}
                                  onChange={(e) => setTplEdit(tpl.id, "body", e.target.value)}
                                  maxLength={500}
                                  rows={3}
                                  className="w-full rounded-xl bg-black/50 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40 resize-none"
                                />
                              </div>
                              {/* Schedule hour */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 block mb-1">Hour (WIB 0–23)</label>
                                  <input
                                    type="number"
                                    min={0} max={23}
                                    value={tHour}
                                    onChange={(e) => setTplEdit(tpl.id, "schedule_hour_wib", parseInt(e.target.value, 10))}
                                    className="w-full rounded-xl bg-black/50 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 block mb-1">Days</label>
                                  <select
                                    value={tDays}
                                    onChange={(e) => setTplEdit(tpl.id, "schedule_days", e.target.value)}
                                    className="w-full rounded-xl bg-black/50 px-3 py-2 text-xs text-white focus:outline-none appearance-none"
                                  >
                                    {SCHEDULE_DAYS_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {/* Audience */}
                              <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-600 block mb-1">Audience</label>
                                <select
                                  value={tAudience}
                                  onChange={(e) => setTplEdit(tpl.id, "audience", e.target.value)}
                                  className="w-full rounded-xl bg-black/50 px-3 py-2 text-xs text-white focus:outline-none appearance-none"
                                >
                                  {SEGMENTS.map((s) => (
                                    <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Preview */}
                              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Preview</p>
                              <NotifPreview title={tTitle} body={tBody} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Queue ── */}
        {activeTab === "queue" && (
          <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Search queue…"
                  className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
              <button onClick={fetchQueue} className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-zinc-400 transition-colors">
                <RefreshCw size={13} className={isLoadingQueue ? "animate-spin" : ""} />
              </button>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-white/5 bg-white/[0.02]">
                <Clock size={28} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-white font-semibold text-sm">Queue is empty</p>
                <p className="text-zinc-500 text-xs mt-1">No pending scheduled notifications</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredQueue.map((notif) => (
                  <div key={notif.id} className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-4 space-y-3">
                    <p className="text-xs font-bold text-white">{notif.title}</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">{notif.body}</p>
                    <div className="space-y-1 text-[9px] font-mono">
                      <div className="flex justify-between text-blue-400">
                        <span>Fire (WIB)</span>
                        <span className="font-bold">{toWIB(notif.scheduled_for)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>Audience</span>
                        <span className="font-bold uppercase">{segmentLabel(notif.segment)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="w-full py-2 flex items-center justify-center gap-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 text-[10px] font-bold transition-colors"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={histSearch}
                  onChange={(e) => setHistSearch(e.target.value)}
                  placeholder="Search history…"
                  className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
                {histSearch && (
                  <button onClick={() => setHistSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    <X size={11} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-zinc-500" />
                <select
                  value={histSegFilter}
                  onChange={(e) => setHistSegFilter(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-xs text-white focus:outline-none appearance-none"
                >
                  <option value="all" className="bg-zinc-900">All Segments</option>
                  {SEGMENTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>
                  ))}
                </select>
              </div>
              <button onClick={fetchHistory} className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-zinc-400 transition-colors">
                <RefreshCw size={13} className={isLoadingHistory ? "animate-spin" : ""} />
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-white/5 bg-white/[0.02]">
                <History size={28} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-white font-semibold text-sm">No history yet</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/5 bg-black/40 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500">Campaign</th>
                      <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 hidden sm:table-cell">Sent (WIB)</th>
                      <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 hidden md:table-cell">Audience</th>
                      <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-500 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHistory.map((n) => (
                      <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 max-w-[200px]">
                          <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{n.body}</p>
                        </td>
                        <td className="px-5 py-3 text-[10px] font-mono text-zinc-400 hidden sm:table-cell">
                          {n.sent_at ? toWIB(n.sent_at) : toWIB(n.scheduled_for)}
                        </td>
                        <td className="px-5 py-3 text-[10px] text-zinc-500 hidden md:table-cell">
                          {segmentLabel(n.segment)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[9px] font-black">
                            Delivered
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
