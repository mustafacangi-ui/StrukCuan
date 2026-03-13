import { useState, useEffect } from "react";
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString();
}

export default function AdminReceipts() {
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
      { onSuccess: closeReview }
    );
  };

  const handleReject = () => {
    if (!reviewingReceipt) return;
    reject.mutate(reviewingReceipt.id, { onSuccess: closeReview });
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="font-display text-lg font-bold text-foreground">
          Admin · Pending Receipts
        </h1>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {receipts.length} pending · Click Review to moderate
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Receipt
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Today
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-sm text-destructive">
                  Failed to load receipts
                </td>
              </tr>
            )}
            {!isLoading && !error && receipts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No pending receipts.
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
                <td className="px-3 py-2 text-[11px] text-muted-foreground">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => openReview(r)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:opacity-90"
                  >
                    Review
                    <ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewingReceipt && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {nicknames.get(reviewingReceipt.user_id) || "User"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Receipt {reviewingReceipt.receipt_index_today ?? "?"}/3 today · {new Date(reviewingReceipt.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={closeReview}
              className="rounded-full p-2 hover:bg-muted"
              aria-label="Close"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Large receipt image */}
            <div className="p-4 bg-muted/20">
              <div className="rounded-xl overflow-hidden border border-border bg-card">
                <img
                  src={viewingImageUrl || reviewingReceipt.image_url}
                  alt="Receipt"
                  className="w-full h-auto block max-h-[50vh] object-contain mx-auto"
                />
              </div>
            </div>

            {/* Previous receipts */}
            {previousReceipts.length > 0 && (
              <div className="px-4 pb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                  Previous receipts today
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {previousReceipts.map((pr) => (
                    <button
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
                          alt={`Receipt ${pr.receipt_index_today}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[9px] font-medium">
                        {pr.receipt_index_today}/3
                      </span>
                      <span className="text-[8px] text-muted-foreground">View</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Cuan</p>
                <div className="flex flex-wrap gap-1.5">
                  {CUAN_OPTIONS.map((n) => (
                    <button
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
                <p className="text-[10px] text-muted-foreground mb-1.5">Ticket</p>
                <div className="flex flex-wrap gap-1.5">
                  {TICKET_OPTIONS.map((n) => (
                    <button
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
                  onClick={handleApprove}
                  disabled={approve.isPending || reject.isPending}
                  className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {approve.isPending ? "..." : `Approve (+${selectedCuan} cuan, +${selectedTicket} ticket)`}
                </button>
                <button
                  onClick={handleReject}
                  disabled={approve.isPending || reject.isPending}
                  className="rounded-xl border-2 border-destructive/50 py-3 text-sm font-bold text-destructive disabled:opacity-60"
                >
                  {reject.isPending ? "..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
