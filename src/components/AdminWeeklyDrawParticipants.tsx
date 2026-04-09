import { useAdminWeeklyDrawParticipants, ParticipantStats } from "@/hooks/useAdminWeeklyDrawParticipants";
import { Users, Ticket, CheckCircle2, MapPin, UserPlus, Trophy, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminWeeklyDrawParticipants() {
  const { data: participants, isLoading, error } = useAdminWeeklyDrawParticipants();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mb-4" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading Participants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/10 bg-red-500/5 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-sm font-bold text-red-400">Failed to load participants</p>
        <p className="text-[10px] text-red-400/60 mt-1 uppercase tracking-tight">Check console for RPC details</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Trophy size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Draw Participants</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Top 10 Contributors this Week</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Sort Order</span>
            <span className="text-xs font-bold text-purple-400">Tickets DESC</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01]">
              <th className="px-6 py-4 text-left text-[10px] uppercase font-black tracking-widest text-zinc-500">Rank & User</th>
              <th className="px-4 py-4 text-center text-[10px] uppercase font-black tracking-widest text-zinc-500">Tickets</th>
              <th className="px-4 py-4 text-center text-[10px] uppercase font-black tracking-widest text-zinc-500">Draw Entries</th>
              <th className="px-4 py-4 text-center text-[10px] uppercase font-black tracking-widest text-zinc-500">Activity</th>
              <th className="px-4 py-4 text-center text-[10px] uppercase font-black tracking-widest text-zinc-500">Invites</th>
              <th className="px-6 py-4 text-right text-[10px] uppercase font-black tracking-widest text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(!participants || participants.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-zinc-600 italic text-sm">
                  No participants found yet this week
                </td>
              </tr>
            ) : (
              participants.map((p, idx) => (
                <motion.tr 
                  key={p.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                        idx === 0 ? 'bg-gold-500/20 border-yellow-500/50 text-yellow-500' : 
                        idx === 1 ? 'bg-zinc-400/10 border-zinc-400/30 text-zinc-400' :
                        idx === 2 ? 'bg-orange-900/20 border-orange-700/30 text-orange-600' :
                        'bg-white/5 border-white/10 text-zinc-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors truncate max-w-[140px]">
                          {p.nickname || ""}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
                          ID: {p.user_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 text-purple-400 font-black text-sm">
                        <span>{p.ticket_count}</span>
                        <Ticket size={10} className="fill-purple-400" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center">
                       <span className="text-xs font-bold text-zinc-300">{p.weekly_entries}</span>
                       <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tight">Entries</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
                          <CheckCircle2 size={10} />
                          <span>{p.approved_receipts}</span>
                        </div>
                        <span className="text-[7px] text-zinc-600 uppercase font-black">Receipts</span>
                      </div>
                      <div className="h-4 w-px bg-white/5" />
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-blue-400 text-[10px] font-bold">
                          <MapPin size={10} />
                          <span>{p.approved_deals}</span>
                        </div>
                        <span className="text-[7px] text-zinc-600 uppercase font-black">Deals</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 text-pink-400 text-[10px] font-bold">
                        <UserPlus size={10} />
                        <span>{p.invited_friends}</span>
                      </div>
                      <span className="text-[7px] text-zinc-600 uppercase font-black tracking-tight">Referrals</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${p.ticket_count > 50 ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`} />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{p.ticket_count > 50 ? 'ELITE' : 'ACTIVE'}</span>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-white/[0.01] border-t border-white/5">
        <button 
          className="w-full py-3 rounded-2xl bg-white/[0.03] hover:bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all flex items-center justify-center gap-3"
          onClick={() => {}} // View All placeholder
        >
          View All Participants
          <Users size={12} className="text-zinc-500" />
        </button>
      </div>
    </div>
  );
}
