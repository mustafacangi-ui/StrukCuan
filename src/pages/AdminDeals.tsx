import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Check, XCircle, Tag, MapPin, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import {
  usePendingDeals,
  useApproveDeal,
  useRejectDeal,
} from "@/hooks/useAdminDeals";

function useUserNicknames(userIds: string[]) {
  return useQuery({
    queryKey: ["user_nicknames", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return new Map<string, string>();
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, nickname")
        .in("user_id", userIds);
      const map = new Map<string, string>();
      (data ?? []).forEach((r: { user_id: string; nickname: string | null }) => {
        map.set(r.user_id, r.nickname || "User");
      });
      return map;
    },
    enabled: userIds.length > 0,
  });
}

export default function AdminDeals() {
  const { t } = useTranslation();
  const { data: deals = [], isLoading, error, refetch } = usePendingDeals();
  const approve = useApproveDeal();
  const reject = useRejectDeal();

  const userIds = [...new Set(deals.filter((d) => d.user_id).map((d) => d.user_id!))];
  const { data: nicknames = new Map() } = useUserNicknames(userIds);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const isToday = d.toDateString() === new Date().toDateString();
    if (isToday) return "Today, " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Deal Queue</h2>
        <p className="text-xs text-zinc-500">You have {deals.length} pending deals</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map((i) => (
             <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to load deals.
        </div>
      )}

      {!isLoading && !error && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-white/5 bg-white/[0.02]">
          <SearchX size={32} className="text-zinc-600 mb-3" />
          <p className="text-zinc-400 font-medium">No pending deals</p>
          <p className="text-xs text-zinc-500 mt-1">Users haven't requested any custom deal approvals.</p>
        </div>
      )}

      {!isLoading && !error && deals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {deals.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative flex flex-col items-start gap-4 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-3 transition-colors overflow-hidden"
            >
              {/* Image Header */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/5">
                {d.image ? (
                  <img src={d.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">No Image</div>
                )}
                
                {/* User Bubble */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-sm">
                  <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                     <span className="text-[8px] font-bold text-white uppercase">{d.user_id ? (nicknames.get(d.user_id) || "U")[0] : "-"}</span>
                  </div>
                  <span className="text-[10px] text-white font-medium truncate max-w-[80px]">
                     {d.user_id ? nicknames.get(d.user_id) || "User" : "System"}
                  </span>
                </div>
              </div>

              {/* Deal Info */}
              <div className="w-full px-1">
                 <h3 className="text-sm font-bold text-white mb-1 leading-tight line-clamp-2">
                    {d.product_name || "Unknown Product"}
                 </h3>
                 <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-3">
                    <MapPin size={10} className="text-blue-400" />
                    <span className="truncate">{d.store || "Location unknown"}</span>
                 </div>
                 
                 <div className="flex items-end justify-between mb-4">
                    <div>
                       {d.price != null && (
                          <div className="text-[9px] text-zinc-500 line-through">Rp {d.price.toLocaleString("id-ID")}</div>
                       )}
                       <div className="text-lg font-black text-green-400">
                           {d.discount != null ? `${d.discount}% OFF` : 'DEAL'}
                       </div>
                    </div>
                    {/* Add Red Label Badge if needed by data model, currently just fake indicator if discount > 50 */}
                    {d.discount && d.discount >= 50 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase flex items-center gap-0.5">
                        <Tag size={8} /> Hot
                      </span>
                    )}
                 </div>
              </div>

              {/* Actions Footer */}
              <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                 <button
                   onClick={() =>
                     reject.mutate(d.id, {
                       onSuccess: () => { toast.success("Deal Rejected"); refetch(); },
                       onError: (err) => toast.error(err?.message || "Failed"),
                     })
                   }
                   disabled={approve.isPending || reject.isPending}
                   className="flex items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2.5 text-[10px] font-bold text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50"
                 >
                   <XCircle size={14} /> Reject
                 </button>
                 <button
                   onClick={() =>
                     approve.mutate(d.id, {
                       onSuccess: () => { toast.success("Deal Approved"); refetch(); },
                       onError: (err) => toast.error(err?.message || "Failed"),
                     })
                   }
                   disabled={approve.isPending || reject.isPending}
                   className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 py-2.5 text-[10px] font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                 >
                   <Check size={14} /> Approve
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
