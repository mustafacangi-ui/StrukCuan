import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ReceiptRow } from "@/hooks/useReceipts";

async function fetchUserReceipts(userId: string): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user receipts", error);
    throw error;
  }

  return (data as ReceiptRow[]) ?? [];
}

export default function ReceiptHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!authLoading && !userId) {
      navigate("/", { replace: true, state: { requireLogin: "receipts" } });
    }
  }, [authLoading, userId, navigate]);

  const { data: receipts = [], isLoading, error } = useQuery({
    queryKey: ["user_receipts", userId],
    queryFn: () => fetchUserReceipts(userId as string),
    enabled: !!userId,
  });

  const formatStatus = (status: string) => {
    switch (status) {
      case "approved":
        return t("receiptHistory.status.approved");
      case "rejected":
        return t("receiptHistory.status.rejected");
      default:
        return t("receiptHistory.status.pending");
    }
  };

  const statusClasses = (status: string) => {
    if (status === "approved") {
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/40";
    }
    if (status === "rejected") {
      return "bg-neon-red/10 text-neon-red border-neon-red/40";
    }
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/40";
  };

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-8">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-display text-lg font-bold text-foreground">
          {t("receiptHistory.title")}
        </h1>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("receiptHistory.subtitle")}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {isLoading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-3 animate-pulse"
              >
                <div className="h-3 w-24 rounded bg-muted mb-2" />
                <div className="h-3 w-40 rounded bg-muted mb-3" />
                <div className="h-32 w-full rounded bg-muted" />
              </div>
            ))}
          </>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-xs text-destructive">
            {t("receiptHistory.error")}
          </div>
        )}

        {!isLoading && !error && receipts.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground text-center">
            {t("receiptHistory.empty")}
          </div>
        )}

        {receipts.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {r.store || t("receiptHistory.noStoreName")}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {t("receiptHistory.total")}: {r.total ?? "-"} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClasses(
                  r.status,
                )}`}
              >
                {formatStatus(r.status)}
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={r.image_url}
                alt={`Receipt ${r.id}`}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

