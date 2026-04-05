import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Send, Sparkles, Ticket, MapPinned, CheckCircle, ScrollText, Calendar, Clock, Edit2, Trash2, Globe, History, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const SEGMENT_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "inactive_users", label: "Inactive users (3+ days)" },
  { value: "low_ticket_users", label: "Low ticket users (<5 tickets)" },
  { value: "indonesia_users", label: "Indonesia users" },
  { value: "survey_users", label: "Survey users" },
];

export default function AdminNotifications() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"instant" | "schedule" | "queue" | "history">("instant");

  // Instant notification state
  const [notifTitle, setNotifTitle] = useState("StrukCuan");
  const [notifBody, setNotifBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Scheduled push state
  const [scheduledTitle, setScheduledTitle] = useState("StrukCuan");
  const [scheduledBody, setScheduledBody] = useState("");
  const [scheduledSegment, setScheduledSegment] = useState("all");
  const [scheduledFor, setScheduledFor] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  // Templates state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  useEffect(() => {
    fetchScheduledNotifications();
    fetchTemplates();
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

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("admin_notification_templates")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSaveTemplate = async () => {
    const title = activeTab === "instant" ? notifTitle : scheduledTitle;
    const body = activeTab === "instant" ? notifBody : scheduledBody;
    if (!title || !body) return toast({ title: "Fill title & body to save template", variant: "destructive" });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("admin_notification_templates")
        .insert({
          title: title,
          message: body,
          category: "Custom",
          created_by: session?.user?.id
        });
        
      if (error) throw error;
      toast({ title: "Template saved to database" });
      fetchTemplates();
    } catch (err: any) {
      toast({ title: "Failed to save template", description: err.message, variant: "destructive" });
    }
  };

  const STATIC_TEMPLATES = [
    { category: "Promotions", items: [{ title: "StrukCuan", text: "Flash deal just dropped! Check your local stores now." }] },
    { category: "Surveys", items: [{ title: "StrukCuan", text: "New surveys available now" }] },
    { category: "Rewards", items: [{ title: "StrukCuan", text: "Receipt approved - tickets added" }] },
    { category: "Red label", items: [{ title: "StrukCuan", text: "New nearby red label available" }] },
    { category: "Weekly draw", items: [{ title: "StrukCuan", text: "Weekly draw today - collect more tickets now!" }, { title: "StrukCuan", text: "Your daily shake is ready!" }] },
  ];

  const handleSendInstant = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { toast({ title: "Validation Error", description: "Fill all fields", variant: "destructive" }); return; }
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
        setNotifBody(""); setNotifTitle("StrukCuan");
      } else throw new Error(result.message);
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleNotification = async () => {
    if (!scheduledTitle.trim() || !scheduledBody.trim() || !scheduledFor) { toast({ title: "Validation Error", description: "Fill all required fields", variant: "destructive" }); return; }
    setIsScheduling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/schedule-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          title: scheduledTitle.trim(), body: scheduledBody.trim(),
          segment: scheduledSegment, scheduled_for: new Date(scheduledFor).toISOString(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Scheduled successfully", description: `For ${new Date(scheduledFor).toLocaleString()}` });
        setScheduledBody(""); setScheduledTitle("StrukCuan"); setScheduledSegment("all"); setScheduledFor("");
        fetchScheduledNotifications();
        setActiveTab("queue");
      } else throw new Error(result.message);
    } catch (error: any) {
      toast({ title: "Failed to schedule", description: error.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    try {
      const { error } = await supabase.from("scheduled_push_notifications").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Notification deleted" });
      fetchScheduledNotifications();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const isSleepingHours = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const hourWIB = parseInt(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }));
    return hourWIB >= 22 || hourWIB < 7;
  };

  return (
    <div className="space-y-4">
      {/* Internal Navigation */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit mx-auto border border-white/5">
        {[
          { id: "instant", label: "Instant Push" },
          { id: "schedule", label: "Schedule Push" },
          { id: "queue", label: "Pending Queue" },
          { id: "history", label: "History & Stats" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {(activeTab === "instant" || activeTab === "schedule") && (
          <motion.div
            key="forms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {/* Editor Area */}
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-3 mb-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border shrink-0 ${activeTab === 'instant' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                  {activeTab === "instant" ? <Send size={18} /> : <Calendar size={18} />}
                </div>
                <div>
                  <p className="font-semibold text-white/90 text-sm">{activeTab === "instant" ? "Instant Broadcast" : "Schedule Push"}</p>
                  <p className="text-[10px] text-zinc-400">{activeTab === "instant" ? "Send immediately to all active devices" : "Target exact segments for precisely timed future drops"}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <input
                  type="text"
                  value={activeTab === "instant" ? notifTitle : scheduledTitle}
                  onChange={(e) => activeTab === "instant" ? setNotifTitle(e.target.value) : setScheduledTitle(e.target.value)}
                  placeholder="Notification Title"
                  className="w-full rounded-2xl border-none bg-black/40 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
                <textarea
                  value={activeTab === "instant" ? notifBody : scheduledBody}
                  onChange={(e) => activeTab === "instant" ? setNotifBody(e.target.value) : setScheduledBody(e.target.value)}
                  placeholder="Notification Body text..."
                  rows={4}
                  className="w-full rounded-2xl border-none bg-black/40 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                />

                {activeTab === "schedule" && (
                  <div className="grid border border-white/5 rounded-2xl bg-black/40 overflow-hidden text-xs">
                     <select
                       value={scheduledSegment}
                       onChange={(e) => setScheduledSegment(e.target.value)}
                       className="w-full bg-transparent px-4 py-3 border-b border-white/5 text-white focus:outline-none appearance-none"
                     >
                       {SEGMENT_OPTIONS.map((opt) => (
                         <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">{opt.label}</option>
                       ))}
                     </select>
                     <input
                       type="datetime-local"
                       value={scheduledFor}
                       onChange={(e) => setScheduledFor(e.target.value)}
                       className="w-full bg-transparent px-4 py-3 text-white focus:outline-none flex-1 font-mono"
                     />
                  </div>
                )}

                {activeTab === "schedule" && scheduledFor && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                     <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                       <Globe size={12} /> Timezone Overview
                     </p>
                     <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-zinc-400 block mb-0.5">Your Local Device</span><span className="font-mono text-zinc-200">{new Date(scheduledFor).toLocaleString()}</span></div>
                        <div><span className="text-zinc-400 block mb-0.5">Jakarta (WIB)</span><span className="font-mono text-[#00E676]">{new Date(scheduledFor).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}</span></div>
                     </div>
                     {isSleepingHours(scheduledFor) && (
                        <div className="text-[10px] font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 p-2 rounded-lg flex items-center gap-1.5 mt-2">
                           <AlertTriangle size={12} /> Warning: This targets Indonesian sleeping hours (22:00 - 07:00 WIB)
                        </div>
                     )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTemplate}
                    className="px-4 py-3 rounded-2xl text-[11px] font-bold border border-white/10 hover:bg-white/10 text-zinc-300 transition-colors flex-shrink-0"
                  >
                    Save as Template
                  </button>
                  {activeTab === "instant" ? (
                    <button
                      onClick={handleSendInstant}
                      disabled={isSending}
                      className="flex-1 py-3 flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50"
                    >
                      {isSending ? "Sending..." : "Send Immediately"} <Send size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleScheduleNotification}
                      disabled={isScheduling}
                      className="flex-1 py-3 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all disabled:opacity-50"
                    >
                      {isScheduling ? "Saving..." : "Lock Schedule"} <Calendar size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Templates Panel */}
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-5 overflow-y-auto max-h-[600px] custom-scrollbar">
               <h3 className="text-sm font-bold text-white mb-4">Quick Templates</h3>
               <div className="space-y-4">
                 {/* Database Custom Templates */}
                 {templates.length > 0 && (
                   <div className="space-y-2">
                     <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Custom Team Templates</p>
                     <div className="flex flex-wrap gap-2">
                        {templates.map(t => (
                           <button
                             key={t.id}
                             onClick={() => {
                               if (activeTab === "instant") { setNotifTitle(t.title); setNotifBody(t.message); }
                               else { setScheduledTitle(t.title); setScheduledBody(t.message); }
                             }}
                             className="text-left px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors max-w-full"
                           >
                             <p className="text-[11px] font-bold text-purple-300 truncate">{t.title}</p>
                             <p className="text-[10px] text-purple-400/80 truncate mt-0.5">{t.message}</p>
                           </button>
                        ))}
                     </div>
                   </div>
                 )}

                 {/* Hardcoded Templates */}
                 {STATIC_TEMPLATES.map((group, idx) => (
                    <div key={idx} className="space-y-2">
                       <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{group.category}</p>
                       <div className="flex flex-wrap gap-2">
                          {group.items.map((item, i) => (
                             <button
                               key={i}
                               onClick={() => {
                                 if (activeTab === "instant") { setNotifTitle(item.title); setNotifBody(item.text); }
                                 else { setScheduledTitle(item.title); setScheduledBody(item.text); }
                               }}
                               className="text-left px-3 py-2 rounded-xl border border-white/5 bg-black/40 hover:bg-white/10 transition-colors max-w-[200px]"
                             >
                               <p className="text-[10px] text-zinc-300 truncate">{item.text}</p>
                             </button>
                          ))}
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          </motion.div>
        )}

        {/* Pending Queue Tab */}
        {activeTab === "queue" && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-4"
           >
              {scheduledNotifications.filter((n) => !n.sent).length === 0 ? (
                 <div className="text-center p-10 mt-10 rounded-3xl border border-white/5 bg-white/[0.02]">
                    <Clock size={32} className="mx-auto mt-4 mb-4 text-zinc-600" />
                    <p className="text-white font-medium">Queue is empty</p>
                    <p className="text-zinc-500 text-xs">No notifications are scheduled to be sent.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduledNotifications.filter((n) => !n.sent).map((notif) => (
                    <div key={notif.id} className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-4 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
                       <p className="text-xs font-bold text-white mb-1">{notif.title}</p>
                       <p className="text-[10px] text-zinc-300 mb-3 leading-snug break-words line-clamp-3">{notif.body}</p>
                       
                       <div className="space-y-1 mb-4 text-[9px] font-mono">
                          <div className="flex justify-between items-center text-blue-400">
                             <span>Schedule (WIB)</span>
                             <span className="font-bold">{new Date(notif.scheduled_for).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-500">
                             <span>Target</span>
                             <span className="font-bold uppercase">{notif.segment}</span>
                          </div>
                       </div>
                       
                       <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteScheduled(notif.id)}
                            className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-bold text-center hover:bg-red-500/30 flex justify-center items-center gap-1 transition-colors"
                          >
                             <Trash2 size={12} /> Delete
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </motion.div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-4"
           >
              {scheduledNotifications.filter((n) => n.sent).length === 0 ? (
                 <div className="text-center p-10 mt-10 rounded-3xl border border-white/5 bg-white/[0.02]">
                    <History size={32} className="mx-auto mt-4 mb-4 text-zinc-600" />
                    <p className="text-white font-medium">History empty</p>
                 </div>
              ) : (
                 <div className="rounded-3xl border border-white/5 bg-black/40 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Campaign</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date (WIB)</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Segment</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Metrics</th>
                          </tr>
                       </thead>
                       <tbody>
                          {scheduledNotifications.filter((n) => n.sent).map((n) => (
                             <tr key={n.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="px-4 py-3 max-w-[200px]">
                                   <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                                   <p className="text-[10px] text-zinc-500 truncate">{n.body}</p>
                                </td>
                                <td className="px-4 py-3 text-[10px] font-mono text-zinc-300">
                                   {new Date(n.scheduled_for).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}
                                </td>
                                <td className="px-4 py-3 text-[10px] text-zinc-400 font-mono uppercase">
                                   {n.segment}
                                </td>
                                <td className="px-4 py-3 text-right">
                                   <div className="flex flex-col items-end gap-1">
                                      <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold text-[8px] uppercase tracking-widest inline-block border border-green-500/30">Delivered</span>
                                      <span className="text-[9px] text-zinc-600 font-medium">Analytics pending via push bridge</span>
                                   </div>
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
