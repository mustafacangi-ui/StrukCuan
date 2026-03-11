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

export function usePendingReceipts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, "pending"],
    queryFn: fetchPendingReceipts,
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

export interface CreateReceiptInput {
  userId: string;
  imageUrl: string;
  store: string;
  total: number | null;
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
            store: input.store,
            total: input.total,
            status: "pending",
          },
        ])
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create receipt", error);
        throw error;
      }

      return data as ReceiptRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RECEIPTS_QUERY_KEY,
      });
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

