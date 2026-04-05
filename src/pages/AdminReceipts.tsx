import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import {
  useAdminPendingReceipts,
  useApproveReceiptWithRewards,
  useRejectReceipt,
  fetchUserReceiptsSameDay,
  type ReceiptRow,
} from "@/hooks/useReceipts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { X, ChevronRight } from "lucide-react";

const CUAN_OPTIONS = [1, 5, 10, 20, 50, 100];
const TICKET_OPTIONS = [1, 2, 3];

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

interface AdminReceiptsProps {
  embedded?: boolean;
}

export default function AdminReceipts({ embedded }: AdminReceiptsProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: receipts = [], isLoading, error, refetch } = useAdminPendingReceipts();
  const approve = useApproveReceiptWithRewards();
  const reject = useRejectReceipt();

  const userIds = [...new Set(receipts.map((r) => r.user_id))];
  const { data: nicknames = new Map() } = useUserNicknames(userIds);

  const [selectedCuan, setSelectedCuan] = useState<number>(50);
  const [selectedTicket, setSelectedTicket] = useState<number>(1);
  const [reviewingReceipt, setReviewingReceipt] = useState<ReceiptRow | null>(null);
  const [previousReceipts, setPreviousReceipts] = useState<ReceiptRow[]>([]);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const [focusedAction, setFocusedAction] = useState<'approve' | 'reject' | null>(null);

  const handleUseAiReward = () => {
    if (reviewingReceipt?.ai_suggested_ticket_reward) {
      setSelectedTicket(reviewingReceipt.ai_suggested_ticket_reward);
      console.log('AI reward applied:', reviewingReceipt.ai_suggested_ticket_reward);
      console.log('AI confidence score:', reviewingReceipt.ai_confidence);
    }
  };

  const handleApplyAiDecision = () => {
    const decision = reviewingReceipt?.ai_auto_decision;
    console.log('AI auto decision:', decision);
    if (decision === 'approve') {
       if (reviewingReceipt?.ai_suggested_ticket_reward) {
          setSelectedTicket(reviewingReceipt.ai_suggested_ticket_reward);
       }
       setFocusedAction('approve');
       console.log('AI auto approve triggered');
    } else if (decision === 'reject') {
       setFocusedAction('reject');
       console.log('AI auto reject triggered');
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return t("admin.receipts.colToday");
    return d.toLocaleDateString();
  };

  const openReview = async (r: ReceiptRow) => {
    setReviewingReceipt(r);
    setViewingImageUrl(r.image_url);
    const sameDay = await fetchUserReceiptsSameDay(r.user_id, r.created_at);
    const others = sameDay.filter((x) => x.id !== r.id).sort((a, b) => (a.receipt_index_today ?? 0) - (b.receipt_index_today ?? 0));
    setPreviousReceipts(others);
  };

  const closeReview = () => {
    setReviewingReceipt(null);
    setPreviousReceipts([]);
    setViewingImageUrl(null);
    setFocusedAction(null);
  };

  const handleViewPrevious = (pr: ReceiptRow) => {
    setViewingImageUrl(pr.image_url);
  };

  const handleApprove = () => {
    if (!reviewingReceipt) return;
    approve.mutate(
      { receipt: reviewingReceipt, cuanReward: selectedCuan, ticketReward: selectedTicket },
      {
        onSuccess: () => {
          toast.success(t("admin.toast.receiptApproved"));
          refetch();
          closeReview();
        },
        onError: () => toast.error(t("admin.toast.receiptActionFailed")),
      }
    );
  };

  const handleReject = () => {
    if (!reviewingReceipt) return;
    reject.mutate(reviewingReceipt.id, {
      onSuccess: () => {
        toast.success(t("admin.toast.receiptRejected"));
        refetch();
        closeReview();
      },
      onError: () => toast.error(t("admin.toast.receiptActionFailed")),
    });
  };

  return (
    <div className={embedded ? "" : "min-h-screen pb-10"}>
      <div
        className={
          embedded
            ? "px-0 pt-2 pb-3"
            : "sticky top-0 z-10 bg-background border-b border-border px-4 py-3"
        }
      >
          <h1 className="font-display text-lg font-bold text-foreground">{t("admin.receipts.title")}</h1>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {t("admin.receipts.subtitle", { count: receipts.length })}
          </p>
        </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.receipts.colUser")}
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.receipts.colReceipt")}
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.receipts.colToday")}
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.receipts.colDate")}
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.receipts.colAction")}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("admin.receipts.loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-sm text-destructive">
                  {t("admin.receipts.error")}
                </td>
              </tr>
            )}
            {!isLoading && !error && receipts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("admin.receipts.empty")}
                </td>
              </tr>
            )}
            {receipts.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border hover:bg-muted/20 transition-colors"
              >
                <td className="px-3 py-2">
                  <span className="text-xs font-medium text-foreground truncate max-w-[100px] block">
                    {nicknames.get(r.user_id) || r.user_id.slice(0, 8)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img
                      src={r.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs font-bold text-primary">
                    {r.receipt_index_today ?? "?"}/3
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground">{formatDate(r.created_at)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => openReview(r)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:opacity-90"
                  >
                    {t("admin.receipts.review")}
                    <ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewingReceipt && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {nicknames.get(reviewingReceipt.user_id) || "User"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {t("admin.receipts.modalSubtitle", {
                  index: reviewingReceipt.receipt_index_today ?? "?",
                  datetime: new Date(reviewingReceipt.created_at).toLocaleString(),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={closeReview}
              className="rounded-full p-2 hover:bg-muted"
              aria-label={t("admin.receipts.close")}
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 bg-muted/20">
              {reviewingReceipt.ai_auto_decision && (
                <div className="mb-4 flex flex-col items-center justify-center space-y-2 bg-card border border-border rounded-xl p-3 shadow-sm">
                  {(() => {
                    const dec = reviewingReceipt.ai_auto_decision;
                    let color = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
                    let label = "AI Suggests Review";
                    if (dec === 'approve') {
                      color = "text-green-500 bg-green-500/10 border-green-500/20";
                      label = "AI Suggests Approve";
                    } else if (dec === 'reject') {
                      color = "text-red-500 bg-red-500/10 border-red-500/20";
                      label = "AI Suggests Reject";
                    }
                    return (
                      <span className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${color}`}>
                        🤖 {label}
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={handleApplyAiDecision}
                    className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors border border-primary/20"
                  >
                    Apply AI Decision
                  </button>
                </div>
              )}

              {reviewingReceipt.ai_duplicate_score && reviewingReceipt.ai_duplicate_score >= 0.8 ? (
                <div className="mb-4 bg-rose-500/10 border-2 border-rose-500/50 rounded-xl p-3 shadow-lg shadow-rose-900/10">
                   <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1 uppercase tracking-wider">
                      <span>⚠️</span>
                      <span>Possible duplicate receipt detected</span>
                   </div>
                   <div className="text-[10px] text-rose-300">
                      Duplicate Score: {(reviewingReceipt.ai_duplicate_score * 100).toFixed(0)}% (Matched Receipt ID: <span className="font-mono bg-rose-500/20 px-1 rounded">{reviewingReceipt.ai_duplicate_receipt_id}</span>)
                   </div>
                </div>
              ) : null}

              <div className="rounded-xl overflow-hidden border border-border bg-card relative">
                <img
                  src={viewingImageUrl || reviewingReceipt.image_url}
                  alt=""
                  className="w-full h-auto block max-h-[50vh] object-contain mx-auto"
                />
              </div>
            </div>

            {reviewingReceipt.ai_confidence !== null && reviewingReceipt.ai_confidence !== undefined ? (
              <div className="px-4 py-3 mx-4 my-2 mb-4 bg-[#0F0A1F] border border-fuchsia-600/50 rounded-xl space-y-3 shadow-lg shadow-fuchsia-900/10">
                <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-2">
                  <h3 className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                    ✨ AI Analysis
                  </h3>
                  {(() => {
                    const conf = reviewingReceipt.ai_confidence || 0;
                    let color = "text-red-400 bg-red-400/10 border-red-400/30";
                    if (conf >= 0.9) color = "text-green-400 bg-green-400/10 border-green-400/30";
                    else if (conf >= 0.7) color = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
                    return (
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${color}`}>
                        Confidence: {(conf * 100).toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px] opacity-90">
                  <div>
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-0.5">Store Name</span>
                    <strong className="text-fuchsia-100">{reviewingReceipt.ai_store_name || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-0.5">Product Name</span>
                    <strong className="text-fuchsia-100">{reviewingReceipt.ai_product_name || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-0.5">Original Price</span>
                    <strong className="text-fuchsia-100">
                      {reviewingReceipt.ai_original_price ? `Rp ${reviewingReceipt.ai_original_price.toLocaleString('id-ID')}` : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-0.5">Discount Price</span>
                    <strong className="text-fuchsia-100">
                      {reviewingReceipt.ai_discount_price ? `Rp ${reviewingReceipt.ai_discount_price.toLocaleString('id-ID')}` : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-0.5">Discount %</span>
                    <strong className="text-fuchsia-100">{reviewingReceipt.ai_discount_percent ? `${reviewingReceipt.ai_discount_percent}%` : "-"}</strong>
                  </div>
                  <div>
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-0.5">Expiry Date</span>
                    <strong className="text-fuchsia-100">{reviewingReceipt.ai_expiry_date || "-"}</strong>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-fuchsia-500/10">
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-1">Red Label</span>
                    {reviewingReceipt.ai_red_label ? (
                      <span className="inline-flex px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-bold">
                        Red Label Detected
                      </span>
                    ) : (
                      <span className="text-fuchsia-300 text-xs">Normal Deal</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-fuchsia-300/60 block text-[9px] uppercase tracking-wider mb-1">Suggested Reward</span>
                    <span className="inline-flex px-3 py-1 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-full text-[11px] font-bold shadow-lg shadow-fuchsia-900/40 border border-fuchsia-400/30">
                       +{reviewingReceipt.ai_suggested_ticket_reward} Tickets
                    </span>
                  </div>
                </div>

                {reviewingReceipt.ai_suggested_ticket_reward ? (
                  <div className="pt-2 mt-2 border-t border-fuchsia-500/20">
                     <button
                        type="button"
                        onClick={handleUseAiReward}
                        className="w-full py-2.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/50 text-fuchsia-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🎯</span> Use AI Reward (+{reviewingReceipt.ai_suggested_ticket_reward})
                     </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="px-4 py-4 mx-4 my-2 mb-4 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                 <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                    <span className="opacity-50">🤖</span> AI analysis not available
                 </span>
              </div>
            )}

            {previousReceipts.length > 0 && (
              <div className="px-4 pb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                  {t("admin.receipts.previousToday")}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {previousReceipts.map((pr) => (
                    <button
                      type="button"
                      key={pr.id}
                      onClick={() => handleViewPrevious(pr)}
                      className={`flex flex-col items-center gap-1 shrink-0 rounded-lg border-2 p-1 transition-colors ${
                        viewingImageUrl === pr.image_url
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="w-16 h-16 rounded overflow-hidden bg-muted">
                        <img
                          src={pr.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[9px] font-medium">{pr.receipt_index_today}/3</span>
                      <span className="text-[8px] text-muted-foreground">{t("admin.receipts.viewThumb")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">{t("admin.receipts.cuanLabel")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CUAN_OPTIONS.map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setSelectedCuan(n)}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${
                        selectedCuan === n
                          ? "bg-amber-400/30 text-amber-400 border-2 border-amber-400/50"
                          : "bg-secondary text-muted-foreground border-2 border-transparent hover:border-amber-400/30"
                      }`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">{t("admin.receipts.ticketLabel")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {TICKET_OPTIONS.map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setSelectedTicket(n)}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${
                        selectedTicket === n
                          ? "bg-red-500/30 text-red-400 border-2 border-red-500/50"
                          : "bg-secondary text-muted-foreground border-2 border-transparent hover:border-red-500/30"
                      }`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approve.isPending || reject.isPending}
                  className={`rounded-xl py-3 text-sm font-bold disabled:opacity-60 transition-all ${
                    focusedAction === 'approve' 
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105 border-2 border-green-400" 
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {approve.isPending
                    ? "..."
                    : t("admin.receipts.approveWithRewards", {
                        cuan: selectedCuan,
                        ticket: selectedTicket,
                      })}
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={approve.isPending || reject.isPending}
                  className={`rounded-xl border-2 py-3 text-sm font-bold disabled:opacity-60 transition-all ${
                    focusedAction === 'reject'
                      ? "border-red-500 bg-red-500/10 text-red-500 shadow-lg shadow-red-500/20 scale-105"
                      : "border-destructive/50 text-destructive"
                  }`}
                >
                  {reject.isPending ? "..." : t("admin.receipts.reject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
