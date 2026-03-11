import { usePendingReceipts, useApproveReceipt, useRejectReceipt } from "@/hooks/useReceipts";

export default function AdminReceipts() {
  const { data: receipts = [], isLoading, error } = usePendingReceipts();
  const approve = useApproveReceipt();
  const reject = useRejectReceipt();

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-10">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-display text-lg font-bold text-foreground">
          Admin · Pending Receipts
        </h1>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Approve gives +50 points and +1 ticket.
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Loading...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-xs text-destructive">
            Failed to load pending receipts
          </div>
        )}

        {!isLoading && !error && receipts.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            No pending receipts.
          </div>
        )}

        {receipts.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {r.store || "Unknown store"}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  User: <span className="font-mono">{r.user_id}</span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Total: {r.total ?? "-"} · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[10px] font-bold text-primary">PENDING</span>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={r.image_url}
                alt={`Receipt ${r.id}`}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => approve.mutate(r.id)}
                disabled={approve.isPending || reject.isPending}
                className="rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {approve.isPending ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => reject.mutate(r.id)}
                disabled={approve.isPending || reject.isPending}
                className="rounded-lg border border-destructive/40 bg-card py-2 text-xs font-bold text-destructive disabled:opacity-60"
              >
                {reject.isPending ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

