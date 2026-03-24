import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import {
  usePendingReceipts,
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
  const { data: receipts = [], isLoading, error } = usePendingReceipts(user?.id);
  const approve = useApproveReceiptWithRewards();
  const reject = useRejectReceipt();

  const userIds = [...new Set(receipts.map((r) => r.user_id))];
  const { data: nicknames = new Map() } = useUserNicknames(userIds);

  const [selectedCuan, setSelectedCuan] = useState<number>(50);
  const [selectedTicket, setSelectedTicket] = useState<number>(1);
  const [reviewingReceipt, setReviewingReceipt] = useState<ReceiptRow | null>(null);
  const [previousReceipts, setPreviousReceipts] = useState<ReceiptRow[]>([]);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

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
  };

  const handleViewPrevious = (pr: ReceiptRow) => {
    setViewingImageUrl(pr.image_url);
  };

  const handleApprove = () => {
    if (!reviewingReceipt) return;
    approve.mutate(
      { receiptId: reviewingReceipt.id, cuan: selectedCuan, tiket: selectedTicket },
      {
        onSuccess: () => {
          toast.success(t("admin.toast.receiptApproved"));
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
              <div className="rounded-xl overflow-hidden border border-border bg-card">
                <img
                  src={viewingImageUrl || reviewingReceipt.image_url}
                  alt=""
                  className="w-full h-auto block max-h-[50vh] object-contain mx-auto"
                />
              </div>
            </div>

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
                  className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
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
                  className="rounded-xl border-2 border-destructive/50 py-3 text-sm font-bold text-destructive disabled:opacity-60"
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
