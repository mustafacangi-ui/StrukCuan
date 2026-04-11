import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Play, CheckCircle2, XCircle, Clock, ListFilter } from "lucide-react";

export default function AdminAds() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("ad_views")
      .select("*")
      .order("ad_started_at", { ascending: false })
      .limit(50);

    if (error || !rows?.length) {
      setLogs(rows || []);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id).filter(Boolean))];
    const { data: stats } = await supabase
      .from("user_stats")
      .select("user_id, nickname")
      .in("user_id", userIds);

    const nickByUser = Object.fromEntries(
      (stats ?? []).map((s: { user_id: string; nickname: string | null }) => [String(s.user_id), s.nickname])
    );

    setLogs(
      rows.map((log: { user_id: string }) => ({
        ...log,
        display_nickname: nickByUser[String(log.user_id)] ?? null,
      }))
    );
    setLoading(false);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Ad Reward Logs</h2>
          <p className="text-xs text-zinc-500 mt-1">Last 50 ad interactions across the platform</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5">
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">User</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Provider</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Status</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Reward</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Duration</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Steps</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="px-6 py-4 bg-white/5 h-12"></td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm">No ad logs found yet</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">{log.display_nickname || log.user_id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-400 border border-white/5 uppercase">
                      {log.provider_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : log.status === 'started' ? (
                        <Play size={14} className="text-blue-500" />
                      ) : (
                        <XCircle size={14} className="text-red-500" />
                      )}
                      <span className={`text-[11px] font-bold uppercase ${
                        log.status === 'completed' ? 'text-green-400' :
                        log.status === 'started' ? 'text-blue-400' : 'text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${log.reward_granted ? 'text-purple-400' : 'text-zinc-500'}`}>
                      {log.reward_granted ? '+1 Ticket' : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Clock size={12} />
                      <span className="text-xs font-mono">{log.completion_duration_seconds || 0}s</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-zinc-300">
                      {log.metadata?.completedSteps || 0} / {log.metadata?.stepCount || 0}
                    </span>
                    <p className="text-[10px] text-zinc-600 font-medium italic mt-0.5">{log.metadata?.closeReason || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] text-zinc-400">{new Date(log.ad_started_at).toLocaleTimeString()}</p>
                    <p className="text-[9px] text-zinc-500">{new Date(log.ad_started_at).toLocaleDateString()}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
