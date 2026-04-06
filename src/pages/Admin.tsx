import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Receipt, MapPin, LayoutDashboard, Bell, Shield, Sparkles, AlertTriangle } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUser } from "@/contexts/UserContext";
import AdminReceipts from "./AdminReceipts";
import AdminDeals from "./AdminDeals";
import AdminNotifications from "./AdminNotifications";
import AdminAds from "./AdminAds";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAdminUserStats } from "@/hooks/useAdminUserStats";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line,
  Cell
} from "recharts";
import { Users, UserPlus, Zap, Clock, TrendingUp, Play, DollarSign, Award } from "lucide-react";

type Tab = "dashboard" | "receipts" | "deals" | "notifications" | "ads";

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const { data: adminStats, isLoading: statsLoading } = useAdminUserStats();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState({ pendingReceipts: 0, pendingDeals: 0 });

  useEffect(() => {
    // Scroll to top on tab change
    window.scrollTo(0, 0);
    
    if (tab === "dashboard" && isAdmin) {
      const fetchStats = async () => {
        const { count: receipts } = await supabase.from("receipts").select("*", { count: "exact", head: true }).eq("status", "pending");
        setStats(s => ({ ...s, pendingReceipts: receipts || 0 }));
      };
      fetchStats();
    }
  }, [tab, isAdmin]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500">{t("auth.mustLogin")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <p className="text-zinc-500 text-center">{t("admin.receipts.noAccess")}</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-purple-400 font-semibold hover:underline">
          {t("admin.receipts.backHome")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 w-full dark">
      {/* Premium Top Navigation */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-3xl border-b border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={16} className="text-zinc-300" />
              </button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xs font-bold leading-none tracking-wide text-white">ADMIN CONSOLE</h1>
                  <p className="text-[10px] text-zinc-500 font-medium">StrukCuan Secure Area</p>
                </div>
              </div>
            </div>
            
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest whitespace-nowrap">
                {adminStats?.onlineNow ?? 0} Online
              </span>
            </div>
          </div>

          {/* Segmented Control Tabs */}
          <div className="px-4 lg:px-8 pb-3">
            <div className="flex p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
              {[
                { id: "dashboard", icon: LayoutDashboard, label: "Overview" },
                { id: "receipts", icon: Receipt, label: "Receipts", count: stats.pendingReceipts },
                { id: "deals", icon: MapPin, label: "Deals" },
                { id: "notifications", icon: Bell, label: "Pushes" },
                { id: "ads", icon: Play, label: "Ads" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as Tab)}
                  className={`relative flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-300 ${
                    tab === t.id ? "text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="admin-active-tab"
                      className="absolute inset-0 bg-white/10 rounded-xl border border-white/10 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <t.icon size={14} className="relative z-10" />
                  <span className="relative z-10">{t.label}</span>
                  {t.count !== undefined && t.count > 0 && (
                    <span className="relative z-10 ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[9px] font-bold text-white leading-none">
                      {t.count > 99 ? "99+" : t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl min-h-[80vh]">
        <AnimatePresence mode="wait">
          {tab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-4 lg:p-8 space-y-6"
            >
              {/* Premium User Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Users", value: adminStats?.totalUsers ?? '-', icon: Users, color: "purple" },
                  { label: "Online Now", value: adminStats?.onlineNow ?? '-', icon: Zap, color: "green", pulse: true },
                  { label: "Active Today", value: adminStats?.activeToday ?? '-', icon: TrendingUp, color: "blue" },
                  { label: "Active This Week", value: adminStats?.activeThisWeek ?? '-', icon: Clock, color: "indigo" },
                  { label: "New Today", value: adminStats?.newToday ?? '-', icon: UserPlus, color: "orange" },
                  { label: "New This Week", value: adminStats?.newThisWeek ?? '-', icon: UserPlus, color: "pink" },
                ].map((card, idx) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative group overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all hover:bg-white/[0.04]"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-500/10 rounded-full blur-[30px] -mr-8 -mt-8`} />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <card.icon size={18} className={`text-${card.color}-400`} />
                      {card.pulse && (
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight relative z-10">{card.value}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1 relative z-10">{card.label}</p>
                  </motion.div>
                ))}
              </div>
              
              {/* Ads Performance Statistics Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                {[
                  { label: "Ad Views Today", value: adminStats?.adTotalViewsToday ?? 0, icon: Play, color: "blue" },
                  { label: "Rewarded Ads", value: adminStats?.adTotalRewardedToday ?? 0, icon: Award, color: "purple" },
                  { label: "Est. Ad Revenue", value: `$${adminStats?.adTotalRevenueToday?.toFixed(2) ?? '0.00'}`, icon: DollarSign, color: "green" },
                  { label: "Reward Rate", value: `${Math.round(((adminStats?.adTotalRewardedToday ?? 0) / (adminStats?.adTotalViewsToday || 1)) * 100)}%`, icon: Zap, color: "orange" },
                ].map((card, idx) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="relative rounded-3xl border border-white/5 bg-white/[0.01] p-4 text-left"
                  >
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <card.icon size={12} className={`text-${card.color}-400/80`} />
                      <span className="text-[10px] uppercase font-bold tracking-widest">{card.label}</span>
                    </div>
                    <p className="text-lg font-bold text-white">{card.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts & Leadboards Column Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Users Chart */}
                <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <UserPlus size={14} className="text-orange-400" />
                    New Users (Last 7 Days)
                  </h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adminStats?.chartNew ?? []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#52525b" 
                          fontSize={10} 
                          tickFormatter={(val) => val.split('-').slice(1).join('/')}
                        />
                        <YAxis stroke="#52525b" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          labelStyle={{ color: '#a1a1aa', fontSize: '10px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Ad Watchers Leaderboard */}
                <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 flex flex-col h-full">
                   <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Zap size={14} className="text-purple-400" />
                    Top Ad Watchers (Today)
                  </h3>
                  <div className="space-y-4 flex-1">
                    {(adminStats?.topAdUsers ?? []).length === 0 ? (
                      <p className="text-xs text-zinc-600 text-center py-10 italic">No activity yet today</p>
                    ) : (
                      adminStats?.topAdUsers.map((u, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-400 w-4">{i+1}.</span>
                            <span className="text-xs text-zinc-300 font-medium group-hover:text-white transition-colors truncate max-w-[120px]">{u.nickname}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                            <span className="text-[10px] font-bold text-purple-400">{u.count}</span>
                            <Play size={8} className="text-purple-400" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => setTab("ads")}
                    className="mt-6 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                  >
                    View All Logs
                  </button>
                </div>
              </div>

              {/* Moderation Queue Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setTab("receipts")}
                  className="relative group overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all hover:bg-white/[0.04] hover:border-purple-500/30"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50" />
                  <Receipt size={22} className="text-purple-400 mb-3 relative z-10" />
                  <p className="text-3xl font-light text-white tracking-tight relative z-10">{stats.pendingReceipts}</p>
                  <p className="text-xs text-zinc-400 mt-1 relative z-10">Pending Receipts</p>
                </button>

                <button
                  onClick={() => setTab("deals")}
                  className="relative group overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all hover:bg-white/[0.04] hover:border-blue-500/30"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50" />
                  <MapPin size={22} className="text-blue-400 mb-3 relative z-10" />
                  <p className="text-3xl font-light text-white tracking-tight relative z-10">0</p>
                  <p className="text-xs text-zinc-400 mt-1 relative z-10">Pending Deals</p>
                </button>

                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] -mr-10 -mt-10 opacity-50" />
                  <AlertTriangle size={22} className="text-yellow-500 mb-3 relative z-10" />
                  <p className="text-3xl font-light text-white tracking-tight relative z-10">-</p>
                  <p className="text-xs text-zinc-400 mt-1 relative z-10">Duplicate Alerts</p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[40px] -mr-10 -mt-10 opacity-50" />
                  <Sparkles size={22} className="text-green-400 mb-3 relative z-10" />
                  <p className="text-3xl font-light text-white tracking-tight relative z-10">-</p>
                  <p className="text-xs text-zinc-400 mt-1 relative z-10">High Confidence AI</p>
                </div>
              </div>

              {/* Tips Section */}
              <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-5 mt-6">
                 <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Admin Tips</h3>
                 <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
                   Welcome to the new StrukCuan Admin Console. Use the segmented controls above to navigate between modules. 
                   Receipts and Deals have been optimized for faster mobile moderation.
                 </p>
              </div>
            </motion.div>
          )}

          {tab === "receipts" && (
            <motion.div
              key="receipts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <AdminReceipts />
            </motion.div>
          )}

          {tab === "deals" && (
            <motion.div
              key="deals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <AdminDeals />
            </motion.div>
          )}

          {tab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <AdminNotifications />
            </motion.div>
          )}

          {tab === "ads" && (
            <motion.div
              key="ads"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <AdminAds />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
