import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DAILY_RECEIPT_LIMIT } from "@/hooks/useUploadLimits";

export type ReceiptStatus = "pending" | "approved" | "rejected";

export interface ReceiptRow {
  id: number;
  user_id: string;
  image_url: string;
  store: string | null;
  total: number | null;
  status: ReceiptStatus;
  created_at: string;
  receipt_index_today?: number | null;
}

export const RECEIPTS_QUERY_KEY = ["receipts"];

/** User-facing message when backend rejects due to daily limit. */
export const DAILY_LIMIT_ERROR = "Daily limit reached, try again tomorrow.";

export function isDailyLimitError(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? "";
  return typeof msg === "string" && msg.toLowerCase().includes("daily limit");
}

async function fetchPendingReceipts(): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch pending receipts", error);
    throw error;
  }

  return (data as ReceiptRow[]) ?? [];
}

export async function fetchUserReceiptsSameDay(
  userId: string,
  receiptDate: string
): Promise<ReceiptRow[]> {
  const dayStart = receiptDate.slice(0, 10) + "T00:00:00.000Z";
  const dayEnd = receiptDate.slice(0, 10) + "T23:59:59.999Z";

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch user receipts same day", error);
    return [];
  }

  return (data as ReceiptRow[]) ?? [];
}

export function usePendingReceipts(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, "pending"],
    queryFn: fetchPendingReceipts,
    enabled: !!userId,
  });

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel("realtime:receipts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts" },
        (payload) => {
          const newRow = payload.new as { status?: ReceiptStatus } | null;
          const oldRow = payload.old as { status?: ReceiptStatus } | null;

          // Only invalidate pending list when status changes to/from pending, or a pending row changes
          const touchesPending =
            newRow?.status === "pending" ||
            oldRow?.status === "pending" ||
            payload.eventType === "INSERT";

          if (touchesPending) {
            queryClient.invalidateQueries({
              queryKey: RECEIPTS_QUERY_KEY,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

async function fetchUserPendingReceipts(userId: string): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("status", "pending")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user pending receipts", error);
    throw error;
  }

  return (data as ReceiptRow[]) ?? [];
}

export function useUserPendingReceipts(userId: string | undefined) {
  return useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, "pending", "user", userId],
    queryFn: () => fetchUserPendingReceipts(userId as string),
    enabled: !!userId,
  });
}

/**
 * Fetches today's receipt count. Backend only (RPC, UTC-based).
 * No frontend date calculations.
 */
export async function fetchReceiptsTodayCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_receipts_today_count", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[fetchReceiptsTodayCount] RPC failed:", error);
    throw error;
  }
  return (data as number) ?? 0;
}

export function useReceiptsToday(userId: string | undefined) {
  return useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, "today", userId],
    queryFn: () => fetchReceiptsTodayCount(userId as string),
    enabled: !!userId,
  });
}

export interface CreateReceiptInput {
  userId: string;
  imageUrl: string;
  store?: string | null;
  total?: number | null;
  receiptIndexToday?: number | null;
}

/** Response from create_receipt RPC. remaining = 3 - (count + 1). */
export interface CreateReceiptResult {
  id: number;
  remaining: number;
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReceiptInput) => {
      const { data, error } = await supabase.rpc("create_receipt", {
        p_user_id: String(input.userId),
        p_image_url: String(input.imageUrl),
        p_store: input.store != null ? String(input.store) : null,
        p_total: input.total != null ? Number(input.total) : null,
        p_receipt_index_today: input.receiptIndexToday != null ? Number(input.receiptIndexToday) : null,
      });

      if (error) {
        const sbError = error as { message?: string };
        console.error("[createReceipt] RPC error:", sbError?.message ?? error);
        throw error;
      }

      const result = data as { id: number; remaining: number };
      return { receipt: { id: result.id } as ReceiptRow, remaining: result.remaining };
    },
    onSuccess: (data, variables) => {
      const remaining = (data as { receipt: ReceiptRow; remaining: number }).remaining;
      const newTodayCount = DAILY_RECEIPT_LIMIT - remaining;
      queryClient.setQueryData([...RECEIPTS_QUERY_KEY, "today", variables.userId], newTodayCount);
      queryClient.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["daily_mission"] });
      queryClient.invalidateQueries({ queryKey: ["referral_count"] });
    },
  });
}

export function useApproveReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiptId: number) => {
      const { error } = await supabase.rpc("approve_receipt", {
        p_receipt_id: receiptId,
      });

      if (error) {
        console.error("Failed to approve receipt", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RECEIPTS_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: ["user_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useApproveReceiptWithRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiptId,
      cuan,
      tiket,
    }: { receiptId: number; cuan: number; tiket: number }) => {
      const { error } = await supabase.rpc("approve_receipt_with_rewards", {
        p_receipt_id: receiptId,
        p_cuan: cuan,
        p_tiket: tiket,
      });

      if (error) {
        console.error("Failed to approve receipt with rewards", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RECEIPTS_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: ["user_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRejectReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiptId: number) => {
      const { error } = await supabase.rpc("reject_receipt", {
        p_receipt_id: receiptId,
      });

      if (error) {
        console.error("Failed to reject receipt", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RECEIPTS_QUERY_KEY,
      });
    },
  });
}

