import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Bell, Send, Calendar, Clock, History, Trash2, Globe, AlertTriangle,
  ChevronDown, ChevronUp, Eye, EyeOff, Play, Search, ToggleLeft,
  ToggleRight, Zap, RefreshCw, Users, Filter, CheckCircle2, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "instant" | "schedule" | "templates" | "queue" | "history";
type TemplateCat = "All" | "Engagement" | "Draw" | "Surveys" | "Promos";

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

interface QuickItem {
  category: TemplateCat;
  icon: string;
  badge: "auto" | "sunday" | "urgent" | "winner" | "live" | "manual";
  label: string;
  title: string;
  text: string;
  audience: string;
  schedule: string;
  variant?: "red" | "gold" | "green" | "blue";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { value: "all",             label: "All Users",          desc: "Every subscribed device" },
  { value: "active_today",    label: "Active Today",        desc: "Uploaded a receipt today" },
  { value: "inactive_today",  label: "Inactive Today",      desc: "No activity today" },
  { value: "inactive_users",  label: "Inactive 3+ Days",    desc: "No upload in 3 days" },
  { value: "zero_entries",    label: "0 Draw Entries",      desc: "Less than 10 tickets" },
  { value: "has_entries",     label: "Has Entries",         desc: "10+ tickets (≥1 entry)" },
  { value: "almost_entry",    label: "Almost Next Entry",   desc: "8–9 tickets toward next entry" },
  { value: "low_ticket_users", label: "Low Tickets",        desc: "Fewer than 5 tickets" },
  { value: "pending_surveys", label: "Pending Surveys",     desc: "No survey in last 7 days" },
  { value: "near_red_label",  label: "Near Red Label",      desc: "Users near shared deals" },
  { value: "indonesia_users", label: "Indonesia Only",      desc: "Country = ID" },
  { value: "survey_users",    label: "Survey Completers",   desc: "Completed ≥1 survey" },
];

const SCHEDULE_DAYS_OPTIONS = [
  { value: "daily",   label: "Every day" },
  { value: "weekday", label: "Weekdays (Mon–Fri)" },
  { value: "weekend", label: "Weekends (Sat–Sun)" },
  { value: "sunday",  label: "Sundays only" },
];

const QUICK_TEMPLATES: QuickItem[] = [
  { category: "Engagement", icon: "☀️", badge: "auto",   label: "Daily Noon",        title: "StrukCuan",                     text: "Have you completed today's tasks? Earn your tickets now.",                                 audience: "inactive_today", schedule: "12:00 daily" },
  { category: "Engagement", icon: "🌙", badge: "auto",   label: "Evening Reminder",  title: "StrukCuan",                     text: "Don't forget to scan your receipts today! Every receipt = 1 ticket.",                      audience: "inactive_today", schedule: "19:30 daily" },
  { category: "Engagement", icon: "🎯", badge: "auto",   label: "Almost There!",     title: "StrukCuan — Almost There!",     text: "Only 1–2 more tickets needed for your next draw entry. Keep scanning!",                    audience: "almost_entry",  schedule: "12:00 daily",  variant: "green" },
  { category: "Draw",       icon: "🎟️", badge: "sunday", label: "Draw Day",          title: "StrukCuan — Draw Day! 🎟️",     text: "Today is draw day. Complete your tasks before tonight's draw at 21:00 WIB.",              audience: "all",           schedule: "Sun 10:00" },
  { category: "Draw",       icon: "⏳", badge: "urgent", label: "Last Chance",        title: "StrukCuan — Last Chance! ⏳",   text: "Only hours until the weekly draw! Last chance to earn tickets before 21:00 WIB.",         audience: "has_entries",   schedule: "Sun 18:00",    variant: "red" },
  { category: "Draw",       icon: "🏆", badge: "winner", label: "Draw Results",       title: "StrukCuan — Draw Results 🏆",   text: "This week's draw winners are announced! Check if your draw code won.",                     audience: "all",           schedule: "Sun 22:00",    variant: "gold" },
  { category: "Surveys",    icon: "📋", badge: "auto",   label: "New Survey",         title: "StrukCuan — New Survey",        text: "A new survey is waiting for you. Complete it now and earn bonus tickets!",                 audience: "pending_surveys", schedule: "12:00 daily" },
  { category: "Promos",     icon: "🔴", badge: "live",   label: "Red Label Nearby",   title: "StrukCuan — 🔴 Deal Nearby",   text: "A red label deal was just shared near you. Check it out and share yours too!",            audience: "near_red_label", schedule: "Live", variant: "red" },
];

const TEMPLATE_CATEGORY_MAP: Record<string, TemplateCat> = {
  daily_noon: "Engagement",
  evening_reminder: "Engagement",
  almost_next_entry: "Engagement",
  sunday_draw_reminder: "Draw",
  final_draw_countdown: "Draw",
  winner_announcement: "Draw",
  new_survey: "Surveys",
  red_label_nearby: "Promos",
};

const TEMPLATE_ICONS: Record<string, string> = {
  daily_noon: "☀️", evening_reminder: "🌙", sunday_draw_reminder: "🎟️",
  final_draw_countdown: "⏳", new_survey: "📋", red_label_nearby: "🔴",
  almost_next_entry: "🎯", winner_announcement: "🏆",
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const TAB_ACTIVE: Record<Tab, string> = {
  instant:   "bg-purple-600/25 text-purple-200 border border-purple-500/50 shadow-[0_0_14px_rgba(168,85,247,0.25)]",
  schedule:  "bg-blue-600/25 text-blue-200 border border-blue-500/50 shadow-[0_0_14px_rgba(59,130,246,0.25)]",
  templates: "bg-orange-600/25 text-orange-200 border border-orange-500/50 shadow-[0_0_14px_rgba(249,115,22,0.25)]",
  queue:     "bg-cyan-600/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_14px_rgba(6,182,212,0.25)]",
  history:   "bg-zinc-600/25 text-zinc-200 border border-zinc-400/30",
};

const CAT_STYLES: Record<TemplateCat, { tab_active: string; tab_inactive: string; card: string; glow: string }> = {
  All:        { tab_active: "bg-white/10 text-white border border-white/20",               tab_inactive: "text-zinc-500 border border-white/5 hover:text-zinc-300 hover:border-white/15",               card: "border-white/8 hover:border-white/15 bg-white/[0.02]",                                                   glow: "" },
  Engagement: { tab_active: "bg-purple-500/20 text-purple-200 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]", tab_inactive: "text-purple-400/60 border border-purple-500/15 hover:text-purple-300 hover:border-purple-500/35", card: "border-purple-500/20 hover:border-purple-500/45 bg-gradient-to-br from-purple-500/[0.06] to-transparent", glow: "shadow-[0_0_10px_rgba(168,85,247,0.12)]" },
  Draw:       { tab_active: "bg-orange-500/20 text-orange-200 border border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.2)]", tab_inactive: "text-orange-400/60 border border-orange-500/15 hover:text-orange-300 hover:border-orange-500/35", card: "border-orange-500/20 hover:border-orange-500/45 bg-gradient-to-br from-orange-500/[0.06] to-transparent",  glow: "shadow-[0_0_10px_rgba(249,115,22,0.12)]" },
  Surveys:    { tab_active: "bg-yellow-500/20 text-yellow-200 border border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.2)]",  tab_inactive: "text-yellow-400/60 border border-yellow-500/15 hover:text-yellow-300 hover:border-yellow-500/35", card: "border-yellow-500/20 hover:border-yellow-500/45 bg-gradient-to-br from-yellow-500/[0.06] to-transparent",  glow: "shadow-[0_0_10px_rgba(234,179,8,0.12)]" },
  Promos:     { tab_active: "bg-red-500/20 text-red-200 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]",           tab_inactive: "text-red-400/60 border border-red-500/15 hover:text-red-300 hover:border-red-500/35",             card: "border-red-500/20 hover:border-red-500/45 bg-gradient-to-br from-red-500/[0.06] to-transparent",           glow: "shadow-[0_0_10px_rgba(239,68,68,0.12)]" },
};

const VARIANT_CLS: Record<string, string> = {
  red:   "!border-red-500/45 !bg-red-500/[0.09] shadow-[0_0_16px_rgba(239,68,68,0.22)] hover:!border-red-500/65",
  gold:  "!border-amber-400/45 !bg-amber-500/[0.09] shadow-[0_0_16px_rgba(251,191,36,0.22)] hover:!border-amber-400/65",
  green: "!border-emerald-500/35 !bg-emerald-500/[0.07] hover:!border-emerald-500/55",
  blue:  "!border-blue-500/35 !bg-blue-500/[0.07] hover:!border-blue-500/55",
};

const BADGE_CLS: Record<string, string> = {
  auto:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  sunday: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  urgent: "bg-red-500/20 text-red-300 border-red-500/35",
  winner: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  live:   "bg-red-600/20 text-red-300 border-red-500/30 animate-pulse",
  manual: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSleepingHours(dateStr: string) {
  if (!dateStr) return false;
  const h = parseInt(new Date(dateStr).toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }), 10);
  return h >= 22 || h < 7;
}

function toWIB(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" });
}

function segmentLabel(v: string) {
  return SEGMENTS.find((s) => s.value === v)?.label ?? v;
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00 WIB`;
}

function scheduleDaysLabel(v: string) {
  return SCHEDULE_DAYS_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotifPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-3 flex items-start gap-3">
      <div className="h-8 w-8 rounded-xl bg-purple-600/40 border border-purple-500/30 flex items-center justify-center shrink-0">
        <Bell size={14} className="text-purple-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white truncate">{title || "Title"}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">{body || "Body text…"}</p>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1.5">
      {children}
    </label>
  );
}

function inputCls(ring = "purple") {
  return `w-full rounded-xl bg-zinc-900/80 border border-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-${ring}-500/40 focus:border-${ring}-500/30 transition-colors`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<Tab>("instant");

  // Compose state
  const [instTitle,   setInstTitle]   = useState("StrukCuan");
  const [instBody,    setInstBody]    = useState("");
  const [instSeg,     setInstSeg]     = useState("all");
  const [isSending,   setIsSending]   = useState(false);
  const [showIPrev,   setShowIPrev]   = useState(true);

  const [schedTitle,     setSchedTitle]     = useState("StrukCuan");
  const [schedBody,      setSchedBody]      = useState("");
  const [schedSeg,       setSchedSeg]       = useState("all");
  const [schedFor,       setSchedFor]       = useState("");
  const [isScheduling,   setIsScheduling]   = useState(false);
  const [showSPrev,      setShowSPrev]      = useState(true);

  // Template sidebar filter (shared for instant+schedule compose panels)
  const [sidebarCat,    setSidebarCat]    = useState<TemplateCat>("All");
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Automated templates tab
  const [templates,         setTemplates]         = useState<PushTemplate[]>([]);
  const [isLoadingTpl,      setIsLoadingTpl]       = useState(false);
  const [tplCat,            setTplCat]            = useState<TemplateCat>("All");
  const [tplSearch,         setTplSearch]         = useState("");
  const [expandedTpl,       setExpandedTpl]       = useState<string | null>(null);
  const [tplEdits,          setTplEdits]          = useState<Record<string, Partial<PushTemplate>>>({});
  const [savingTpl,         setSavingTpl]         = useState<string | null>(null);
  const [togglingTpl,       setTogglingTpl]       = useState<string | null>(null);
  const [sendingTpl,        setSendingTpl]        = useState<string | null>(null);

  // Queue + history
  const [queue,           setQueue]           = useState<ScheduledPush[]>([]);
  const [isLoadingQueue,  setIsLoadingQueue]   = useState(false);
  const [queueSearch,     setQueueSearch]     = useState("");
  const [history,         setHistory]         = useState<ScheduledPush[]>([]);
  const [isLoadingHist,   setIsLoadingHist]   = useState(false);
  const [histSearch,      setHistSearch]      = useState("");
  const [histSeg,         setHistSeg]         = useState("all");

  // ── Fetching ────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTpl(true);
    try {
      const { data } = await supabase.from("push_notification_templates").select("*").order("schedule_hour_wib");
      if (data) setTemplates(data);
    } finally { setIsLoadingTpl(false); }
  }, []);

  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const { data } = await supabase.from("scheduled_push_notifications").select("*").eq("sent", false).order("scheduled_for");
      setQueue(data ?? []);
    } finally { setIsLoadingQueue(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHist(true);
    try {
      const { data } = await supabase.from("scheduled_push_notifications").select("*").eq("sent", true).order("sent_at", { ascending: false }).limit(100);
      setHistory(data ?? []);
    } finally { setIsLoadingHist(false); }
  }, []);

  useEffect(() => { fetchTemplates(); fetchQueue(); fetchHistory(); }, [fetchTemplates, fetchQueue, fetchHistory]);

  // ── Auth helper ─────────────────────────────────────────────────────────────

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
  }

  // ── Instant send ────────────────────────────────────────────────────────────

  async function handleSendInstant() {
    if (!instTitle.trim() || !instBody.trim()) { toast.error("Fill title and body"); return; }
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/send-push", {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ title: instTitle.trim(), body: instBody.trim(), segment: instSeg }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Sent to ${json.successful}/${json.total} devices`);
        setInstBody(""); setInstTitle("StrukCuan"); setInstSeg("all");
        fetchHistory();
      } else toast.error(json.message ?? "Send failed");
    } catch (e: any) { toast.error(e.message); } finally { setIsSending(false); }
  }

  // ── Schedule ────────────────────────────────────────────────────────────────

  async function handleSchedule() {
    if (!schedTitle.trim() || !schedBody.trim() || !schedFor) { toast.error("Fill all fields"); return; }
    if (new Date(schedFor) <= new Date()) { toast.error("Must be in the future"); return; }
    setIsScheduling(true);
    try {
      const res = await fetch("/api/admin/schedule-push", {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ title: schedTitle.trim(), body: schedBody.trim(), segment: schedSeg, scheduled_for: new Date(schedFor).toISOString() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Scheduled for ${toWIB(schedFor)}`);
        setSchedBody(""); setSchedTitle("StrukCuan"); setSchedSeg("all"); setSchedFor("");
        setActiveTab("queue"); fetchQueue();
      } else toast.error(json.message ?? "Failed");
    } catch (e: any) { toast.error(e.message); } finally { setIsScheduling(false); }
  }

  // ── Delete queue ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const { error } = await supabase.from("scheduled_push_notifications").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    fetchQueue(); fetchHistory();
  }

  // ── Template helpers ────────────────────────────────────────────────────────

  function getTplField<K extends keyof PushTemplate>(tpl: PushTemplate, field: K): PushTemplate[K] {
    return (tplEdits[tpl.id]?.[field] ?? tpl[field]) as PushTemplate[K];
  }

  function setTplEdit(id: string, field: keyof PushTemplate, value: any) {
    setTplEdits((p) => ({ ...p, [id]: { ...p[id], [field]: value } }));
  }

  async function saveTemplate(tpl: PushTemplate) {
    const edits = tplEdits[tpl.id];
    if (!edits || !Object.keys(edits).length) return;
    setSavingTpl(tpl.id);
    try {
      const { error } = await supabase.from("push_notification_templates").update(edits).eq("id", tpl.id);
      if (error) throw error;
      toast.success(`"${tpl.name}" saved`);
      setTplEdits((p) => { const n = { ...p }; delete n[tpl.id]; return n; });
      fetchTemplates();
    } catch (e: any) { toast.error(e.message); } finally { setSavingTpl(null); }
  }

  async function toggleTemplate(tpl: PushTemplate) {
    setTogglingTpl(tpl.id);
    try {
      const { error } = await supabase.from("push_notification_templates").update({ enabled: !tpl.enabled }).eq("id", tpl.id);
      if (error) throw error;
      toast.success(`"${tpl.name}" ${!tpl.enabled ? "enabled" : "disabled"}`);
      fetchTemplates();
    } catch (e: any) { toast.error(e.message); } finally { setTogglingTpl(null); }
  }

  async function sendTemplateNow(tpl: PushTemplate) {
    setSendingTpl(tpl.id);
    try {
      const title    = getTplField(tpl, "title") as string;
      const body     = getTplField(tpl, "body")  as string;
      const audience = getTplField(tpl, "audience") as string;
      const res = await fetch("/api/admin/send-push", {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ title, body, segment: audience }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`"${tpl.name}" → ${json.successful}/${json.total} devices`);
        await supabase.from("push_notification_templates").update({ last_sent_at: new Date().toISOString() }).eq("id", tpl.id);
        fetchTemplates();
      } else toast.error(json.message);
    } catch (e: any) { toast.error(e.message); } finally { setSendingTpl(null); }
  }

  // ── Apply template to compose ───────────────────────────────────────────────

  function applyQuickTemplate(item: { title: string; text: string }) {
    if (activeTab === "instant")  { setInstTitle(item.title);  setInstBody(item.text); }
    if (activeTab === "schedule") { setSchedTitle(item.title); setSchedBody(item.text); }
  }

  // ── Filtered sidebar templates ──────────────────────────────────────────────

  const filteredSidebar = useMemo(() =>
    QUICK_TEMPLATES.filter((t) =>
      (sidebarCat === "All" || t.category === sidebarCat) &&
      (!sidebarSearch || t.label.toLowerCase().includes(sidebarSearch.toLowerCase()) || t.text.toLowerCase().includes(sidebarSearch.toLowerCase()))
    ),
    [sidebarCat, sidebarSearch]
  );

  const filteredTpl = useMemo(() =>
    templates.filter((t) => {
      const cat = TEMPLATE_CATEGORY_MAP[t.template_key] ?? "Engagement";
      const matchCat = tplCat === "All" || cat === tplCat;
      const matchSearch = !tplSearch || t.name.toLowerCase().includes(tplSearch.toLowerCase()) || t.body.toLowerCase().includes(tplSearch.toLowerCase());
      return matchCat && matchSearch;
    }),
    [templates, tplCat, tplSearch]
  );

  const filteredQueue = useMemo(() =>
    queue.filter((n) => !queueSearch || n.title.toLowerCase().includes(queueSearch.toLowerCase()) || n.body.toLowerCase().includes(queueSearch.toLowerCase())),
    [queue, queueSearch]
  );

  const filteredHistory = useMemo(() =>
    history.filter((n) => {
      const ms = !histSearch || n.title.toLowerCase().includes(histSearch.toLowerCase()) || n.body.toLowerCase().includes(histSearch.toLowerCase());
      const sg = histSeg === "all" || n.segment === histSeg;
      return ms && sg;
    }),
    [history, histSearch, histSeg]
  );

  // ── Category tab pills (shared) ─────────────────────────────────────────────

  const CATS: TemplateCat[] = ["All", "Engagement", "Draw", "Surveys", "Promos"];

  function CatPills({ active, setActive }: { active: TemplateCat; setActive: (c: TemplateCat) => void }) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${active === c ? CAT_STYLES[c].tab_active : CAT_STYLES[c].tab_inactive}`}
          >
            {c}
          </button>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Template sidebar card
  // ─────────────────────────────────────────────────────────────────────────────

  function TemplateCard({ item }: { item: QuickItem }) {
    const catS = CAT_STYLES[item.category];
    const baseCls = `${catS.card} ${item.variant ? VARIANT_CLS[item.variant] : catS.glow}`;
    const badgeCls = BADGE_CLS[item.badge] ?? BADGE_CLS.manual;

    return (
      <button
        onClick={() => applyQuickTemplate({ title: item.title, text: item.text })}
        className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 group ${baseCls}`}
      >
        <div className="flex items-start gap-2.5">
          <span className="text-lg leading-none shrink-0 mt-0.5">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-bold text-white/90 group-hover:text-white transition-colors leading-none truncate">{item.label}</p>
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black border shrink-0 ${badgeCls}`}>
                {item.badge.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors line-clamp-1 leading-relaxed">{item.text}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/8 text-[8px] text-zinc-600">
                👥 {segmentLabel(item.audience)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/8 text-[8px] text-zinc-600">
                🕐 {item.schedule}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Compose layout (40/60 sticky split)
  // ─────────────────────────────────────────────────────────────────────────────

  function ComposeLayout({ mode }: { mode: "instant" | "schedule" }) {
    const isI = mode === "instant";
    const title    = isI ? instTitle   : schedTitle;
    const body     = isI ? instBody    : schedBody;
    const seg      = isI ? instSeg     : schedSeg;
    const setTitle = isI ? setInstTitle : setSchedTitle;
    const setBody  = isI ? setInstBody  : setSchedBody;
    const setSeg   = isI ? setInstSeg   : setSchedSeg;
    const showPrev = isI ? showIPrev    : showSPrev;
    const setShowPrev = isI ? setShowIPrev : setShowSPrev;
    const accentRing = isI ? "purple" : "blue";

    return (
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── Left form (sticky) 40% ── */}
        <div className="w-full lg:w-[40%] lg:sticky lg:top-4 space-y-3">
          {/* Form card */}
          <div className={`rounded-2xl border bg-zinc-950/80 backdrop-blur p-4 space-y-3 ${isI ? "border-purple-500/15" : "border-blue-500/15"}`}>
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-xl border shrink-0 flex items-center justify-center ${isI ? "bg-purple-500/15 border-purple-500/25 text-purple-400" : "bg-blue-500/15 border-blue-500/25 text-blue-400"}`}>
                {isI ? <Send size={14} /> : <Calendar size={14} />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{isI ? "Instant Broadcast" : "Schedule Push"}</p>
                <p className="text-[10px] text-zinc-500">{isI ? "Fires immediately to target segment" : "Queued and fired by hourly cron"}</p>
              </div>
            </div>

            {/* Title */}
            <div>
              <FieldLabel>Title</FieldLabel>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Notification title"
                className={inputCls(accentRing)}
              />
              <p className="text-right text-[9px] text-zinc-700 mt-0.5">{title.length}/100</p>
            </div>

            {/* Body */}
            <div>
              <FieldLabel>Message</FieldLabel>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                rows={5}
                placeholder="Notification body…"
                className={`${inputCls(accentRing)} resize-none`}
              />
              <p className="text-right text-[9px] text-zinc-700 mt-0.5">{body.length}/500</p>
            </div>

            {/* Audience */}
            <div>
              <FieldLabel><Users size={9} className="inline mr-1" />Audience</FieldLabel>
              <select
                value={seg}
                onChange={(e) => setSeg(e.target.value)}
                className={`${inputCls(accentRing)} appearance-none`}
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-zinc-900">
                    {s.label} — {s.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule-only */}
            {!isI && (
              <>
                <div>
                  <FieldLabel><Clock size={9} className="inline mr-1" />Date & Time</FieldLabel>
                  <input
                    type="datetime-local"
                    value={schedFor}
                    onChange={(e) => setSchedFor(e.target.value)}
                    className={`${inputCls("blue")} font-mono`}
                  />
                </div>
                {schedFor && (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-zinc-600 block mb-0.5">Device</span>
                        <span className="font-mono text-zinc-400 text-[9px]">{new Date(schedFor).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block mb-0.5">Jakarta (WIB)</span>
                        <span className="font-mono text-emerald-400 text-[9px]">{toWIB(schedFor)}</span>
                      </div>
                    </div>
                    {isSleepingHours(schedFor) && (
                      <div className="flex items-center gap-1.5 text-[9px] text-yellow-400 bg-yellow-400/8 border border-yellow-400/20 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle size={10} /> Sleeping hours (22:00–07:00 WIB)
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Preview toggle */}
            <button
              onClick={() => setShowPrev(!showPrev)}
              className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showPrev ? <EyeOff size={10} /> : <Eye size={10} />}
              {showPrev ? "Hide preview" : "Show preview"}
            </button>
            <AnimatePresence>
              {showPrev && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <NotifPreview title={title} body={body} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Sticky send button ── */}
          {isI ? (
            <button
              onClick={handleSendInstant}
              disabled={isSending || !instTitle.trim() || !instBody.trim()}
              className="w-full py-3.5 flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white shadow-[0_0_24px_rgba(168,85,247,0.4)] transition-all text-sm"
            >
              {isSending ? <><RefreshCw size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send Immediately</>}
            </button>
          ) : (
            <button
              onClick={handleSchedule}
              disabled={isScheduling || !schedTitle.trim() || !schedBody.trim() || !schedFor}
              className="w-full py-3.5 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white shadow-[0_0_24px_rgba(59,130,246,0.4)] transition-all text-sm"
            >
              {isScheduling ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><Calendar size={14} /> Lock Schedule</>}
            </button>
          )}
        </div>

        {/* ── Right: template picker 60% ── */}
        <div className="w-full lg:w-[60%] space-y-3">
          {/* Picker header */}
          <div className="flex items-center gap-2 px-0.5">
            <Zap size={11} className="text-yellow-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quick Templates</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                <X size={10} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <CatPills active={sidebarCat} setActive={setSidebarCat} />

          {/* Cards */}
          {filteredSidebar.length === 0 ? (
            <p className="text-center text-zinc-600 text-xs py-8">No templates match</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredSidebar.map((item, i) => (
                <TemplateCard key={i} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Outer tabs
  // ─────────────────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "instant",   label: "Instant",   icon: <Send size={11} /> },
    { id: "schedule",  label: "Schedule",  icon: <Calendar size={11} /> },
    { id: "templates", label: "Templates", icon: <Bell size={11} /> },
    { id: "queue",     label: "Queue",     icon: <Clock size={11} />, badge: queue.length || undefined },
    { id: "history",   label: "History",   icon: <History size={11} /> },
  ];

  return (
    <div className="space-y-4 pb-16">
      {/* ── Tab bar ── */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white/[0.025] border border-white/[0.05] w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${
              activeTab === t.id ? TAB_ACTIVE[t.id] : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]"
            }`}
          >
            {t.icon}{t.label}
            {t.badge ? (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-cyan-500 text-white text-[8px] font-black flex items-center justify-center px-1">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Instant ── */}
        {activeTab === "instant" && (
          <motion.div key="i" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ComposeLayout mode="instant" />
          </motion.div>
        )}

        {/* ── Schedule ── */}
        {activeTab === "schedule" && (
          <motion.div key="s" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ComposeLayout mode="schedule" />
          </motion.div>
        )}

        {/* ── Automated Templates ── */}
        {activeTab === "templates" && (
          <motion.div key="t" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-white">Automated Templates</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Enabled templates fire via hourly cron — edit, toggle on, done.</p>
              </div>
              <button onClick={fetchTemplates} className="p-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.08] text-zinc-500 transition-colors">
                <RefreshCw size={12} className={isLoadingTpl ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Search + category */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={tplSearch}
                  onChange={(e) => setTplSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-7 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-white/10 w-36"
                />
              </div>
              <CatPills active={tplCat} setActive={setTplCat} />
            </div>

            {/* Template cards */}
            {isLoadingTpl && !templates.length ? (
              <p className="text-zinc-600 text-xs text-center py-8">Loading…</p>
            ) : filteredTpl.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <Bell size={24} className="mx-auto mb-3 text-zinc-700" />
                <p className="text-white text-sm font-semibold">No templates found</p>
                <p className="text-zinc-600 text-xs mt-1">Run <code className="bg-black/40 px-1 rounded">push_notification_templates_migration.sql</code> in Supabase.</p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTpl.map((tpl) => {
                  const cat = TEMPLATE_CATEGORY_MAP[tpl.template_key] ?? "Engagement";
                  const catS = CAT_STYLES[cat];
                  const isExpanded = expandedTpl === tpl.id;
                  const hasEdits   = !!(tplEdits[tpl.id] && Object.keys(tplEdits[tpl.id]).length);
                  const tTitle   = getTplField(tpl, "title") as string;
                  const tBody    = getTplField(tpl, "body") as string;
                  const tHour    = getTplField(tpl, "schedule_hour_wib") as number;
                  const tDays    = getTplField(tpl, "schedule_days") as string;
                  const tAud     = getTplField(tpl, "audience") as string;

                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-2xl border overflow-hidden transition-all ${
                        tpl.enabled
                          ? `${catS.card} ${catS.glow}`
                          : "border-white/[0.06] bg-white/[0.015]"
                      }`}
                    >
                      {/* Card header */}
                      <div className="p-3 flex items-start gap-2.5">
                        <span className="text-xl shrink-0 leading-none mt-0.5">{TEMPLATE_ICONS[tpl.template_key] ?? "📣"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-xs font-bold text-white/90 truncate leading-none">{tpl.name}</p>
                            <button
                              onClick={() => toggleTemplate(tpl)}
                              disabled={togglingTpl === tpl.id}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black border transition-all shrink-0 ${
                                tpl.enabled
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-white/[0.04] border-white/[0.1] text-zinc-600 hover:border-white/20 hover:text-zinc-400"
                              }`}
                            >
                              {tpl.enabled ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
                              {tpl.enabled ? "ON" : "OFF"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/12 border border-blue-500/20 text-blue-300/80 text-[8px] font-bold">{hourLabel(tpl.schedule_hour_wib)}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/12 border border-purple-500/20 text-purple-300/80 text-[8px] font-bold">{scheduleDaysLabel(tpl.schedule_days)}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 text-[8px] font-bold">{segmentLabel(tpl.audience)}</span>
                          </div>
                          {tpl.last_sent_at && (
                            <p className="text-[9px] text-zinc-700 mt-1.5">Last: {toWIB(tpl.last_sent_at)}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => sendTemplateNow(tpl)}
                          disabled={sendingTpl === tpl.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/25 text-purple-300 text-[9px] font-bold transition-all disabled:opacity-50"
                        >
                          {sendingTpl === tpl.id ? <RefreshCw size={9} className="animate-spin" /> : <Play size={9} />}
                          Send Now
                        </button>
                        <button
                          onClick={() => setExpandedTpl(isExpanded ? null : tpl.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-500 text-[9px] font-bold transition-all"
                        >
                          {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                          {isExpanded ? "Collapse" : "Edit"}
                        </button>
                        {hasEdits && (
                          <button
                            onClick={() => saveTemplate(tpl)}
                            disabled={savingTpl === tpl.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold transition-all ml-auto"
                          >
                            {savingTpl === tpl.id ? <RefreshCw size={9} className="animate-spin" /> : <CheckCircle2 size={9} />}
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
                            className="overflow-hidden border-t border-white/[0.05]"
                          >
                            <div className="p-3 space-y-3 bg-black/30">
                              <div>
                                <FieldLabel>Title</FieldLabel>
                                <input type="text" value={tTitle} onChange={(e) => setTplEdit(tpl.id, "title", e.target.value)} maxLength={100}
                                  className="w-full rounded-xl bg-black/50 border border-white/[0.06] px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30" />
                              </div>
                              <div>
                                <FieldLabel>Body</FieldLabel>
                                <textarea value={tBody} onChange={(e) => setTplEdit(tpl.id, "body", e.target.value)} maxLength={500} rows={3}
                                  className="w-full rounded-xl bg-black/50 border border-white/[0.06] px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <FieldLabel>Hour (WIB 0–23)</FieldLabel>
                                  <input type="number" min={0} max={23} value={tHour} onChange={(e) => setTplEdit(tpl.id, "schedule_hour_wib", parseInt(e.target.value, 10))}
                                    className="w-full rounded-xl bg-black/50 border border-white/[0.06] px-3 py-2 text-xs text-white focus:outline-none" />
                                </div>
                                <div>
                                  <FieldLabel>Days</FieldLabel>
                                  <select value={tDays} onChange={(e) => setTplEdit(tpl.id, "schedule_days", e.target.value)}
                                    className="w-full rounded-xl bg-black/50 border border-white/[0.06] px-3 py-2 text-xs text-white focus:outline-none appearance-none">
                                    {SCHEDULE_DAYS_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <FieldLabel>Audience</FieldLabel>
                                <select value={tAud} onChange={(e) => setTplEdit(tpl.id, "audience", e.target.value)}
                                  className="w-full rounded-xl bg-black/50 border border-white/[0.06] px-3 py-2 text-xs text-white focus:outline-none appearance-none">
                                  {SEGMENTS.map((s) => <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>)}
                                </select>
                              </div>
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
          <motion.div key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input value={queueSearch} onChange={(e) => setQueueSearch(e.target.value)} placeholder="Search queue…"
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-700 focus:outline-none" />
              </div>
              <button onClick={fetchQueue} className="p-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.08] text-zinc-500 transition-colors">
                <RefreshCw size={12} className={isLoadingQueue ? "animate-spin" : ""} />
              </button>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="text-center py-14 rounded-2xl border border-white/[0.05] bg-white/[0.015]">
                <Clock size={24} className="mx-auto mb-2 text-zinc-700" />
                <p className="text-white text-sm font-semibold">Queue is empty</p>
                <p className="text-zinc-600 text-xs mt-1">No pending scheduled notifications</p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredQueue.map((n) => (
                  <div key={n.id} className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-3.5 space-y-2.5">
                    <p className="text-xs font-bold text-white">{n.title}</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">{n.body}</p>
                    <div className="text-[9px] font-mono space-y-1">
                      <div className="flex justify-between text-blue-400/80"><span>Fire (WIB)</span><span className="font-bold">{toWIB(n.scheduled_for)}</span></div>
                      <div className="flex justify-between text-zinc-600"><span>Audience</span><span>{segmentLabel(n.segment)}</span></div>
                    </div>
                    <button onClick={() => handleDelete(n.id)}
                      className="w-full py-1.5 flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[9px] font-bold transition-colors">
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && (
          <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-40">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input value={histSearch} onChange={(e) => setHistSearch(e.target.value)} placeholder="Search history…"
                  className="w-full pl-7 pr-7 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-700 focus:outline-none" />
                {histSearch && (
                  <button onClick={() => setHistSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                    <X size={10} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Filter size={10} className="text-zinc-600 shrink-0" />
                <select value={histSeg} onChange={(e) => setHistSeg(e.target.value)}
                  className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-2.5 py-2 text-xs text-white focus:outline-none appearance-none">
                  <option value="all" className="bg-zinc-900">All Segments</option>
                  {SEGMENTS.map((s) => <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>)}
                </select>
              </div>
              <button onClick={fetchHistory} className="p-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.08] text-zinc-500 transition-colors">
                <RefreshCw size={12} className={isLoadingHist ? "animate-spin" : ""} />
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-14 rounded-2xl border border-white/[0.05] bg-white/[0.015]">
                <History size={24} className="mx-auto mb-2 text-zinc-700" />
                <p className="text-white text-sm font-semibold">No history yet</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-white/[0.025]">
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-600">Campaign</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-600 hidden sm:table-cell">Sent (WIB)</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-600 hidden md:table-cell">Audience</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-600 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredHistory.map((n) => (
                      <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs font-semibold text-white/90 truncate">{n.title}</p>
                          <p className="text-[10px] text-zinc-600 truncate mt-0.5">{n.body}</p>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono text-zinc-500 hidden sm:table-cell">
                          {n.sent_at ? toWIB(n.sent_at) : toWIB(n.scheduled_for)}
                        </td>
                        <td className="px-4 py-3 text-[10px] text-zinc-600 hidden md:table-cell">
                          {segmentLabel(n.segment)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/20 text-emerald-400 text-[8px] font-black">
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
