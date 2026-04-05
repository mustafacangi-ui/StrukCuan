import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import {
  useAdminFilteredReceipts,
  useApproveReceiptWithRewards,
  useRejectReceipt,
  fetchUserReceiptsSameDay,
  type ReceiptRow,
} from "@/hooks/useReceipts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { X, Check, XCircle, AlertTriangle, Sparkles, Tag, ExternalLink, Settings, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TICKET_OPTIONS = [1, 2, 3];
// Red label receipts earn 3 tickets, normal receipts earn 1
const DEFAULT_TICKET = 1;
const RED_LABEL_TICKET = 3;

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

function AIConfidenceBadge({ confidence }: { confidence?: number | null }) {
  if (confidence == null) return null;
  let color = "bg-red-500/10 text-red-400 border-red-500/20";
  if (confidence >= 0.9) color = "bg-green-500/10 text-green-400 border-green-500/20";
  else if (confidence >= 0.7) color = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

  return (
    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${color}`}>
      {(confidence * 100).toFixed(0)}%
    </span>
  );
}

interface AdminReceiptsProps {
  embedded?: boolean;
}

export default function AdminReceipts({ embedded }: AdminReceiptsProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<'pending' | 'auto_approved' | 'auto_rejected' | 'manual_review'>('pending');

  const { data: receipts = [], isLoading, error, refetch } = useAdminFilteredReceipts(filterTab);
  
  // App Settings Toggle state
  const { data: autoEnabled, refetch: refetchSettings } = useQuery({
     queryKey: ["app_settings", "ai_auto_approve_enabled"],
     queryFn: async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'ai_auto_approve_enabled').maybeSingle();
        return data?.value === "true" || data?.value === true;
     }
  });

  const toggleAutoApprove = async () => {
      const newVal = !autoEnabled;
      const { error } = await supabase.from('app_settings').update({ value: newVal }).eq('key', 'ai_auto_approve_enabled');
      if (error) { toast.error("Failed to update AI settings"); return; }
      toast.success(newVal ? "AI Auto Approval Enabled" : "AI Auto Approval Disabled");
      refetchSettings();
  };

  const approve = useApproveReceiptWithRewards();
  const reject = useRejectReceipt();

  const userIds = [...new Set(receipts.map((r) => r.user_id))];
  const { data: nicknames = new Map() } = useUserNicknames(userIds);

  const [selectedTicket, setSelectedTicket] = useState<number>(1);
  const [reviewingReceipt, setReviewingReceipt] = useState<ReceiptRow | null>(null);
  const [previousReceipts, setPreviousReceipts] = useState<ReceiptRow[]>([]);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<'approve' | 'reject' | null>(null);

  const handleUseAiReward = () => {
    if (reviewingReceipt?.ai_suggested_ticket_reward) {
      setSelectedTicket(reviewingReceipt.ai_suggested_ticket_reward);
    }
  };

  const handleApplyAiDecision = () => {
    const decision = reviewingReceipt?.ai_auto_decision;
    if (decision === 'approve') {
       if (reviewingReceipt?.ai_suggested_ticket_reward) {
          setSelectedTicket(reviewingReceipt.ai_suggested_ticket_reward);
       }
       setFocusedAction('approve');
    } else if (decision === 'reject') {
       setFocusedAction('reject');
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const isToday = d.toDateString() === new Date().toDateString();
    if (isToday) return "Today, " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openReview = async (r: ReceiptRow) => {
    setReviewingReceipt(r);
    setViewingImageUrl(r.image_url);
    const sameDay = await fetchUserReceiptsSameDay(r.user_id, r.created_at);
    setPreviousReceipts(sameDay.filter((x) => x.id !== r.id).sort((a, b) => (a.receipt_index_today ?? 0) - (b.receipt_index_today ?? 0)));
    // Auto-select ticket reward: red label = 3, normal = 1
    const isRedLabel = r.ai_red_label === true;
    if (r.ai_auto_decision === 'approve' && r.ai_suggested_ticket_reward) {
       setSelectedTicket(r.ai_suggested_ticket_reward);
       setFocusedAction('approve');
    } else if (r.ai_auto_decision === 'reject') {
       setFocusedAction('reject');
       setSelectedTicket(DEFAULT_TICKET);
    } else {
       // Default: red label gets 3 tickets, normal gets 1
       setSelectedTicket(isRedLabel ? RED_LABEL_TICKET : DEFAULT_TICKET);
       setFocusedAction(null);
    }
  };

  const closeReview = () => {
    setReviewingReceipt(null);
    setPreviousReceipts([]);
    setViewingImageUrl(null);
    setFocusedAction(null);
  };

  const handleApprove = () => {
    if (!reviewingReceipt) return;
    const tempId = reviewingReceipt.id;
    approve.mutate(
      { receipt: reviewingReceipt, cuanReward: 0, ticketReward: selectedTicket },
      {
        onSuccess: () => {
          toast.success("Receipt Approved");
          queryClient.invalidateQueries({ queryKey: ['admin-pending-receipts'] });
          queryClient.invalidateQueries({ queryKey: ['receipts'] });
          refetch();
          closeReview();
        },
        onError: () => toast.error("Action failed"),
      }
    );
  };

  const handleReject = () => {
    if (!reviewingReceipt) return;
    reject.mutate(reviewingReceipt.id, {
      onSuccess: () => {
        toast.success("Receipt Rejected");
        queryClient.invalidateQueries({ queryKey: ['admin-pending-receipts'] });
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
        refetch();
        closeReview();
      },
      onError: () => toast.error("Action failed"),
    });
  };

  return (
    <div className="w-full">
      {/* Header & Settings (if not embedded) */}
      {!embedded && (
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Receipt Queue</h2>
            <p className="text-xs text-zinc-500">You have {receipts.length} {filterTab.replace('_', ' ')} receipts</p>
          </div>

          <div className="flex flex-col gap-3 items-end">
            {/* AI Safety Toggle */}
            <button
               onClick={toggleAutoApprove}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors shadow-sm ${
                 autoEnabled 
                   ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                   : 'bg-zinc-800/50 border-white/5 text-zinc-500'
               }`}
            >
               <Power size={12} className={autoEnabled ? 'animate-pulse' : ''} />
               {autoEnabled ? 'AI Auto-Approve: ON' : 'AI Auto-Approve: OFF'}
            </button>
            
            {/* Filter Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full">
              {[
                { id: 'pending', label: 'Pending Review' },
                { id: 'auto_approved', label: 'Auto Approved' },
                { id: 'auto_rejected', label: 'Auto Rejected' },
                { id: 'manual_review', label: 'Manual Review' }
              ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setFilterTab(tab.id as any)}
                   className={`px-4 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                     filterTab === tab.id 
                       ? 'bg-white/10 text-white shadow-sm' 
                       : 'text-zinc-500 hover:text-zinc-300'
                   }`}
                 >
                   {tab.label}
                 </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4].map((i) => (
             <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5" />
          ))}
        </div>
      )}

      {!isLoading && !error && receipts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-white/5 bg-white/[0.02]">
          <Check size={32} className="text-zinc-600 mb-3" />
          <p className="text-zinc-400 font-medium">All caught up!</p>
          <p className="text-xs text-zinc-500 max-w-[200px] mt-1">There are no pending receipts to review today.</p>
        </div>
      )}

      {/* Grid Layout replacing Table */}
      {!isLoading && receipts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {receipts.map((r, i) => {
            const isHighConfidence = r.ai_confidence && r.ai_confidence >= 0.85;
            const isDuplicate = r.ai_duplicate_score && r.ai_duplicate_score >= 0.8;
            
            return (
              <motion.button
                key={r.id}
                onClick={() => openReview(r)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative flex flex-col items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-3 text-left transition-colors overflow-hidden"
              >
                {/* Image Preview Area */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/5">
                  <img
                    src={r.image_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Overlays on Image */}
                  <div className="absolute top-2 left-2 flex gap-1">
                     <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-sm">
                       {r.receipt_index_today ?? "?"}/3
                     </span>
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                     {filterTab === 'pending' && r.ai_auto_decision === 'approve' && (
                        <span className="px-1.5 py-0.5 rounded pl-1 bg-green-500/80 backdrop-blur text-white border-green-400 text-[10px] font-bold flex items-center gap-1">
                           <Check size={10} /> Suggests Approve
                        </span>
                     )}
                     {filterTab === 'pending' && r.ai_auto_decision === 'reject' && (
                        <span className="px-1.5 py-0.5 rounded pl-1 bg-red-500/80 backdrop-blur text-white border-red-400 text-[10px] font-bold flex items-center gap-1">
                           <XCircle size={10} /> Suggests Reject
                        </span>
                     )}
                     {r.status === 'approved' && r.ai_auto_processed === true && (
                        <span className="px-1.5 py-0.5 rounded pl-1 bg-purple-500/90 backdrop-blur text-white border-purple-400 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_10px_purple]">
                           <Sparkles size={10} /> AI Approved
                        </span>
                     )}
                     {r.status === 'rejected' && r.ai_auto_processed === true && (
                        <span className="px-1.5 py-0.5 rounded pl-1 bg-zinc-700/90 backdrop-blur text-white border-zinc-500 text-[10px] font-bold flex items-center gap-1">
                           <X size={10} /> AI Rejected
                        </span>
                     )}
                     {isDuplicate && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/80 backdrop-blur text-black text-[10px] font-bold flex items-center gap-1">
                           <AlertTriangle size={10} /> Dup
                        </span>
                     )}
                  </div>
                </div>

                {/* Sub info */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2 min-w-0">
                       <div className="h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                         <span className="text-[8px] font-bold text-white">{(nicknames.get(r.user_id) || "U")[0]}</span>
                       </div>
                       <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                         {nicknames.get(r.user_id) || "User"}
                       </span>
                     </div>
                     <AIConfidenceBadge confidence={r.ai_confidence} />
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                     <div className="truncate text-zinc-400">
                        <span className="opacity-50">Store:</span> <span className="text-zinc-200">{r.ai_store_name || "Unknown"}</span>
                     </div>
                     <div className="truncate text-zinc-400 text-right">
                        {formatDate(r.created_at)}
                     </div>
                  </div>
                </div>
                
                {/* AI Hover Overlay Hint */}
                <div className="absolute inset-0 border-2 border-purple-500/0 group-hover:border-purple-500/50 transition-colors rounded-2xl pointer-events-none" />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Modern Bottom Sheet Modal */}
      <AnimatePresence>
        {reviewingReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm sm:p-4 md:p-6 lg:p-8"
          >
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full sm:w-[500px] lg:w-[800px] h-full sm:rounded-3xl bg-zinc-950 border-l sm:border border-white/10 flex flex-col overflow-hidden shadow-2xl relative flex-shrink-0"
            >
               {/* Modal Header */}
               <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                  <div>
                     <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {nicknames.get(reviewingReceipt.user_id) || "User"}
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-normal">
                          {formatDate(reviewingReceipt.created_at)}
                        </span>
                     </h3>
                  </div>
                  <button
                     onClick={closeReview}
                     className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-zinc-400 hover:text-white"
                  >
                     <X size={16} />
                  </button>
               </div>

               {/* Modal Body / Split Layout */}
               <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-0">
                  {/* Left Side: Image Preview Container */}
                  <div className="w-full lg:w-1/2 p-4 flex flex-col gap-4 border-r border-white/5">
                     <div className="w-full rounded-2xl bg-black overflow-hidden border border-white/5 relative aspect-[3/4] flex justify-center items-center">
                        <img
                          src={viewingImageUrl || reviewingReceipt.image_url}
                          alt="Receipt"
                          className="max-w-full max-h-full object-contain"
                        />
                     </div>
                     {/* Previous Receipts Thumbs */}
                     {previousReceipts.length > 0 && (
                       <div>
                         <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Previous Receipts Today</p>
                         <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                           {previousReceipts.map(pr => (
                              <button
                                key={pr.id}
                                onClick={() => setViewingImageUrl(pr.image_url)}
                                className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                  viewingImageUrl === pr.image_url ? 'border-purple-500 opacity-100' : 'border-white/10 opacity-50 hover:opacity-100'
                                }`}
                              >
                                 <img src={pr.image_url} alt="" className="w-full h-full object-cover" />
                              </button>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>

                  {/* Right Side: AI Data & Controls */}
                  <div className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col gap-5">
                    {/* Big Warnings if any */}
                    {reviewingReceipt.ai_duplicate_score && reviewingReceipt.ai_duplicate_score >= 0.8 ? (
                      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                         <p className="text-yellow-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={14} /> Duplicate Alert
                         </p>
                         <p className="text-[10px] text-yellow-200/80">
                            Score: {(reviewingReceipt.ai_duplicate_score * 100).toFixed(0)}% from ID 
                            <span className="font-mono bg-yellow-500/20 px-1 py-0.5 rounded ml-1">{reviewingReceipt.ai_duplicate_receipt_id}</span>
                         </p>
                      </div>
                    ) : null}

                    {/* Extracted AI Info */}
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                             <Sparkles size={14} /> AI Analysis
                          </h4>
                          <AIConfidenceBadge confidence={reviewingReceipt.ai_confidence} />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                             <span className="block text-[9px] uppercase tracking-wider text-purple-300/50 mb-0.5">Store</span>
                             <span className="font-medium text-white">{reviewingReceipt.ai_store_name || "—"}</span>
                          </div>
                          <div>
                             <span className="block text-[9px] uppercase tracking-wider text-purple-300/50 mb-0.5">Product</span>
                             <span className="font-medium text-white">{reviewingReceipt.ai_product_name || "—"}</span>
                          </div>
                          <div>
                             <span className="block text-[9px] uppercase tracking-wider text-purple-300/50 mb-0.5">Orig Price</span>
                             <span className="font-medium text-white line-through opacity-70">
                               {reviewingReceipt.ai_original_price ? `Rp${reviewingReceipt.ai_original_price.toLocaleString()}` : "—"}
                             </span>
                          </div>
                          <div>
                             <span className="block text-[9px] uppercase tracking-wider justify-between flex text-purple-300/50 mb-0.5">
                               Discount <span className="text-purple-400 font-bold">{reviewingReceipt.ai_discount_percent ? `${reviewingReceipt.ai_discount_percent}%` : ""}</span>
                             </span>
                             <span className="font-bold text-green-400">
                               {reviewingReceipt.ai_discount_price ? `Rp${reviewingReceipt.ai_discount_price.toLocaleString()}` : "—"}
                             </span>
                          </div>
                          <div className="col-span-2 flex items-center justify-between border-t border-purple-500/10 pt-3">
                             <div className="flex gap-2">
                               {reviewingReceipt.ai_red_label && (
                                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase flex items-center gap-1">
                                    <Tag size={10} /> Red Label
                                  </span>
                               )}
                               {reviewingReceipt.ai_auto_decision && (
                                  <span className={`px-2 py-1 rounded border text-[9px] font-bold uppercase flex items-center gap-1
                                    ${reviewingReceipt.ai_auto_decision === 'approve' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                                    ${reviewingReceipt.ai_auto_decision === 'review' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''}
                                    ${reviewingReceipt.ai_auto_decision === 'reject' ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}>
                                    Sugg: {reviewingReceipt.ai_auto_decision}
                                  </span>
                               )}
                             </div>
                             {reviewingReceipt.ai_suggested_ticket_reward ? (
                                <button
                                  onClick={handleUseAiReward}
                                  className="text-[10px] font-bold hover:bg-purple-500/20 px-2 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 transition-colors"
                                >
                                  +Use Reward ({reviewingReceipt.ai_suggested_ticket_reward}x)
                                </button>
                             ) : null}
                          </div>
                       </div>
                    </div>

                    {/* Reward Selection */}
                    <div className="space-y-4">
                       <div>
                         <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Ticket Reward</p>
                         <div className="flex flex-wrap gap-2">
                           {TICKET_OPTIONS.map(n => (
                              <button
                                key={n}
                                onClick={() => setSelectedTicket(n)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                  selectedTicket === n ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50'
                                }`}
                              >+{n}</button>
                           ))}
                         </div>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Sticky Action Footer */}
               <div className="flex items-center gap-3 p-4 border-t border-white/5 bg-zinc-950 sticky bottom-0 w-full z-10 shrink-0">
                 {reviewingReceipt.ai_auto_decision && (
                   <button
                     onClick={handleApplyAiDecision}
                     className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-colors"
                   >
                     Apply AI Setup
                   </button>
                 )}
                 <div className="flex-1 grid grid-cols-2 gap-3">
                   <button
                     onClick={handleReject}
                     disabled={approve.isPending || reject.isPending}
                     className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                       focusedAction === 'reject' 
                         ? 'border-red-500 bg-red-500/20 text-red-500 scale-100 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                         : 'border-white/5 hover:border-red-500/50 bg-transparent text-zinc-400'
                     }`}
                   >
                     {reject.isPending ? '...' : 'Reject'}
                   </button>
                   <button
                     onClick={handleApprove}
                     disabled={approve.isPending || reject.isPending}
                     className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                       focusedAction === 'approve'
                         ? 'border-green-500 bg-green-500 text-black scale-[1.02] shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                         : 'border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                     }`}
                   >
                     {approve.isPending ? '...' : `Approve (+${selectedTicket} Ticket${selectedTicket > 1 ? 's' : ''})`}
                   </button>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
