import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Check, XCircle, Tag, MapPin, SearchX, X, ExternalLink, Calendar, Percent } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePendingDeals,
  useApproveDeal,
  useRejectDeal,
  type PendingDeal,
} from "@/hooks/useAdminDeals";

const TICKET_OPTIONS = [1, 2, 3];

function useUserNicknames(userIds: string[]) {
  return useQuery({
    queryKey: ["user_nicknames_deals", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return new Map<string, string>();
      // Try user_stats first
      const { data: statsData } = await supabase
        .from("user_stats")
        .select("user_id, nickname")
        .in("user_id", userIds);

      const map = new Map<string, string>();

      (statsData ?? []).forEach((r: { user_id: string; nickname: string | null }) => {
        if (r.nickname) map.set(r.user_id, r.nickname);
      });

      // For any remaining, try survey_profiles
      const missing = userIds.filter((id) => !map.has(id));
      if (missing.length > 0) {
        const { data: spData } = await supabase
          .from("survey_profiles")
          .select("user_id, nickname")
          .in("user_id", missing);
        (spData ?? []).forEach((r: { user_id: string; nickname?: string | null }) => {
          if (r.nickname) map.set(r.user_id, r.nickname);
        });
      }

      // Fallback: first 6 chars of UUID
      userIds.forEach((id) => {
        if (!map.has(id)) map.set(id, `User-${id.slice(0, 6)}`);
      });

      return map;
    },
    enabled: userIds.length > 0,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday) return "Today, " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DealDetailModal({
  deal,
  nickname,
  onClose,
  onApprove,
  onReject,
  isPending,
}: {
  deal: PendingDeal;
  nickname: string;
  onClose: () => void;
  onApprove: (tickets: number) => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const [selectedTicket, setSelectedTicket] = useState(deal.ticket_reward || 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm sm:p-4 md:p-6 lg:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full sm:w-[480px] h-full sm:rounded-3xl bg-zinc-950 border-l sm:border border-white/10 flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {nickname}
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-normal">
                {deal.created_at ? formatDate(deal.created_at) : "—"}
              </span>
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Deal Submission</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Full Image */}
          <div className="w-full rounded-2xl bg-black overflow-hidden border border-white/5 relative">
            {deal.image ? (
              <>
                <img
                  src={deal.image}
                  alt="Deal"
                  className="w-full object-contain max-h-[60vh]"
                />
                <a
                  href={deal.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
              </>
            ) : (
              <div className="w-full h-40 flex items-center justify-center text-zinc-600 text-sm">
                No Image
              </div>
            )}
          </div>

          {/* Deal Details */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5">Product</p>
                <p className="text-sm font-bold text-white">{deal.product_name || "—"}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {deal.is_red_label && (
                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase flex items-center gap-1">
                    <Tag size={9} /> Red Label
                  </span>
                )}
                {deal.discount != null && deal.discount >= 50 && (
                  <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-bold uppercase flex items-center gap-1">
                    <Tag size={9} /> Hot Deal
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5 flex items-center gap-1">
                  <MapPin size={9} /> Store / Location
                </p>
                <p className="font-medium text-white">{deal.store || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5 flex items-center gap-1">
                  <Percent size={9} /> Discount
                </p>
                <p className="font-black text-green-400 text-lg leading-none">
                  {deal.discount != null ? `${deal.discount}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5">Original Price</p>
                <p className="font-medium text-white">
                  {deal.price != null ? `Rp ${deal.price.toLocaleString("id-ID")}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5 flex items-center gap-1">
                  <Calendar size={9} /> Expires
                </p>
                <p className="font-medium text-white">
                  {deal.expiry ? new Date(deal.expiry).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            {deal.lat != null && deal.lng != null && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Coordinates</p>
                <a
                  href={`https://www.google.com/maps?q=${deal.lat},${deal.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <MapPin size={10} />
                  {deal.lat.toFixed(5)}, {deal.lng.toFixed(5)}
                  <ExternalLink size={9} />
                </a>
              </div>
            )}
          </div>

          {/* Submitter */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white uppercase">{nickname[0]}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">{nickname}</p>
              <p className="text-[9px] text-zinc-500">Submitted {deal.created_at ? formatDate(deal.created_at) : "—"}</p>
            </div>
          </div>

          {/* Reward Selection */}
          <div className="space-y-4 px-1 pt-2">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Ticket Reward</p>
              <div className="flex flex-wrap gap-2">
                {TICKET_OPTIONS.map(n => (
                   <button
                     key={n}
                     onClick={() => setSelectedTicket(n)}
                     className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                       selectedTicket === n ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:border-blue-500/50'
                     }`}
                   >+{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 p-4 border-t border-white/5 bg-zinc-950 sticky bottom-0">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <button
              onClick={onReject}
              disabled={isPending}
              className="py-3 rounded-2xl text-sm font-bold border-2 border-white/5 hover:border-red-500/50 bg-transparent text-zinc-400 hover:text-red-400 transition-all disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(selectedTicket)}
              disabled={isPending}
              className="py-3 rounded-2xl text-sm font-bold border-2 border-blue-500/50 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
            >
              {isPending ? "..." : `Approve (+${selectedTicket})`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminDeals() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: deals = [], isLoading, error, refetch } = usePendingDeals();
  const approve = useApproveDeal();
  const reject = useRejectDeal();
  const [reviewingDeal, setReviewingDeal] = useState<PendingDeal | null>(null);

  const userIds = [...new Set(deals.filter((d) => d.user_id).map((d) => d.user_id!))];
  const { data: nicknames = new Map() } = useUserNicknames(userIds);

  const closeModal = () => setReviewingDeal(null);

  const handleApprove = (dealId: number | string, ticketReward: number) => {
    approve.mutate({ dealId, ticketReward }, {
      onSuccess: () => {
        toast.success("Deal Approved & Tickets Granted");
        queryClient.invalidateQueries({ queryKey: ["deals"] });
        refetch();
        closeModal();
      },
      onError: (err: Error) => {
        console.error('[AdminDeals] Approve failed — deal kept visible:', err);
        toast.error("Approval failed: " + (err?.message || "Unknown error"));
        // Do NOT close modal or remove item — let admin retry
      },
    });
  };

  const handleReject = (dealId: number | string) => {
    reject.mutate(dealId, {
      onSuccess: () => {
        toast.success("Deal Rejected");
        queryClient.invalidateQueries({ queryKey: ["deals"] });
        refetch();
        closeModal();
      },
      onError: (err: Error) => toast.error(err?.message || "Failed"),
    });
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
          {deals.map((d, i) => {
            const nick = d.user_id ? (nicknames.get(d.user_id) || `User-${d.user_id.slice(0,6)}`) : "System";
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative flex flex-col items-start gap-4 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-3 transition-colors overflow-hidden cursor-pointer"
                onClick={() => setReviewingDeal(d)}
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
                      <span className="text-[8px] font-bold text-white uppercase">{nick[0]}</span>
                    </div>
                    <span className="text-[10px] text-white font-medium truncate max-w-[80px]">
                      {nick}
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
                    {d.discount && d.discount >= 50 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase flex items-center gap-0.5">
                        <Tag size={8} /> Hot
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="w-full grid grid-cols-2 gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleReject(d.id)}
                    disabled={approve.isPending || reject.isPending}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2.5 text-[10px] font-bold text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => handleApprove(d.id, 3)}
                    disabled={approve.isPending || reject.isPending}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 py-2.5 text-[10px] font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Check size={14} /> Approve
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Deal Detail Modal */}
      <AnimatePresence>
        {reviewingDeal && (
          <DealDetailModal
            deal={reviewingDeal}
            nickname={reviewingDeal.user_id ? (nicknames.get(reviewingDeal.user_id) || `User-${reviewingDeal.user_id.slice(0,6)}`) : "System"}
            onClose={closeModal}
            onApprove={(tickets) => handleApprove(reviewingDeal.id, tickets)}
            onReject={() => handleReject(reviewingDeal.id)}
            isPending={approve.isPending || reject.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
