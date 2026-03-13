import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

async function fetchReceiptsTodayCount(userId: string): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayStr = startOfDay.toISOString();

  const { count, error } = await supabase
    .from("receipts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStr);

  if (error) {
    console.error("Failed to fetch receipts today count", error);
    return 0;
  }
  return count ?? 0;
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
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReceiptInput) => {
      const { data, error } = await supabase
        .from("receipts")
        .insert([
          {
            user_id: input.userId,
            image_url: input.imageUrl,
            store: input.store ?? null,
            total: input.total ?? null,
            status: "pending",
            receipt_index_today: input.receiptIndexToday ?? null,
          },
        ])
        .select("*")
        .single();

      if (error) {
        const sbError = error as { message?: string; code?: string; details?: string; hint?: string };
        console.error("[createReceipt] Supabase insert error:", {
          message: sbError.message,
          code: sbError.code,
          details: sbError.details,
          hint: sbError.hint,
          full: error,
        });
        throw error;
      }

      return data as ReceiptRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RECEIPTS_QUERY_KEY,
      });
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

