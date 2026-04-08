import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { RefreshCcw, ShieldAlert, UserSearch, XCircle } from "lucide-react";

export default function AdminLuckyShakeControls() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetDaily = async () => {
    if (!userId) {
      toast.error("Please enter a User ID");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_lucky_shake', { p_user_id: userId });
      if (error) throw error;
      toast.success("Daily Lucky Shake reset successfully for " + userId);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to reset: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearWeekly = async () => {
    if (!userId) {
      toast.error("Please enter a User ID");
      return;
    }
    if (!confirm("Are you sure? This will delete the user's weekly ticket count and reset their shake counter for this week.")) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_clear_weekly_limit', { p_user_id: userId });
      if (error) throw error;
      toast.success("Weekly limits cleared successfully for " + userId);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to clear weekly: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
          <ShieldAlert className="text-purple-400" size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lucky Shake Emergency Controls</h3>
          <p className="text-[10px] text-zinc-500 font-medium">Bypass limits or fix stuck user states</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block px-1">Target User ID (UUID)</label>
          <div className="relative">
            <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleResetDaily}
            disabled={loading || !userId}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-bold uppercase tracking-wider hover:bg-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            Reset Daily turn
          </button>

          <button
            onClick={handleClearWeekly}
            disabled={loading || !userId}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
          >
            <XCircle size={14} />
            Clear Weekly Limits
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
        <p className="text-[9px] text-yellow-500/70 leading-relaxed italic">
          Note: "Reset Daily" clears the shake_last_at timestamp. "Clear Weekly" resets shake_days_this_week and DELETES this week's entry from user_tickets table. Use with caution.
        </p>
      </div>
    </div>
  );
}
