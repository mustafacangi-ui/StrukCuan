import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { DAILY_RECEIPT_LIMIT } from "@/hooks/useUploadLimits";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";
import { extractReceiptData } from "@/utils/extractReceiptData";

export type ReceiptStatus = "pending" | "approved" | "rejected";

export interface ReceiptRow {
  id: string | number;
  user_id: string;
  image_url: string;
  store: string | null;
  total: number | null;
  status: ReceiptStatus;
  created_at: string;
  receipt_index_today?: number | null;
  ai_store_name?: string | null;
  ai_product_name?: string | null;
  ai_original_price?: number | null;
  ai_discount_price?: number | null;
  ai_discount_percent?: number | null;
  ai_expiry_date?: string | null;
  ai_red_label?: boolean;
  ai_suggested_ticket_reward?: number;
  ai_confidence?: number | null;
  ai_raw_text?: string | null;
  image_hash?: string | null;
  ai_duplicate_score?: number | null;
  ai_duplicate_receipt_id?: string | null;
  ai_auto_decision?: 'approve' | 'review' | 'reject' | null;
  ai_auto_processed?: boolean;
  ai_processed_at?: string;
  ai_processing_reason?: string;
}

export const RECEIPTS_QUERY_KEY = ["receipts"];

/** Simple Jaccard similarity for AI text comparison */
export function getTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/** User-facing message when backend rejects due to daily limit. */
export const DAILY_LIMIT_ERROR = "Daily limit reached, try again tomorrow.";

/** Detects backend daily-limit rejection. Handles Supabase { message, details } shape. */
export function isDailyLimitError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { message?: string; details?: string };
  const msg = String(err?.message ?? err?.details ?? "").toLowerCase();
  return msg.includes("daily limit");
}

/** Detects server-side duplicate receipt rejection. */
export function isDuplicateReceiptError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { message?: string };
  return String(err?.message ?? "").includes("DUPLICATE_RECEIPT");
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

export function useAdminFilteredReceipts(filter: 'pending' | 'auto_approved' | 'auto_rejected' | 'manual_review') {
  return useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, "admin", filter],
    queryFn: async () => {
      let query = supabase.from('receipts').select('*').order('created_at', { ascending: false });
      
      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filter === 'auto_approved') {
        query = query.eq('status', 'approved').eq('ai_auto_processed', true);
      } else if (filter === 'auto_rejected') {
        query = query.eq('status', 'rejected').eq('ai_auto_processed', true);
      } else if (filter === 'manual_review') {
        query = query.in('status', ['approved', 'rejected']).is('ai_auto_processed', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as ReceiptRow[]) ?? [];
    }
  });
}

export function useAdminPendingReceipts() {
  return useAdminFilteredReceipts('pending');
}

export function usePendingReceipts(userId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...RECEIPTS_QUERY_KEY, "pending"],
    queryFn: fetchPendingReceipts,
    enabled: true, // Always enabled for admin use; pass null for admin
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
  if (!userId || typeof userId !== "string") {
    console.warn("[fetchReceiptsTodayCount] Invalid userId:", userId);
    return 0;
  }
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
  imageHash?: string | null;
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
      const userId = input.userId;

      const params = {
        p_user_id: userId,
        p_image_url: String(input.imageUrl),
        p_store: input.store != null ? String(input.store) : null,
        p_total: input.total != null ? Number(input.total) : null,
        p_receipt_index_today: input.receiptIndexToday != null ? Number(input.receiptIndexToday) : null,
        // NOTE: p_image_hash omitted here — saved later in AI update payload
        // Prevents crash if DB was created before security_hardening.sql was applied
      };
      const { data, error } = await supabase.rpc("create_receipt", params);

      if (error) {
        const msg = (error as { message?: string }).message ?? "Upload failed. Please try again.";
        console.error('[Upload] create_receipt RPC failed:', error);
        const err = new Error(msg);
        (err as unknown as { originalError: unknown }).originalError = error;
        throw err;
      }

      const result = data as { id: string | number; remaining: number };
      const receiptId = result.id;

      // Automatically run OCR Extraction Phase 1 MVP
      console.log('[OCR] starting');
      try {
        const aiResult = await extractReceiptData(input.imageUrl);
        console.log('[OCR] parsed result', aiResult);

        // --- DUPLICATE DETECTION LOGIC ---
        let duplicateScore = 0;
        let duplicateReceiptId: string | null = null;
        
        // Fetch user's previous receipts to check duplicates over the last 50 receipts
        const { data: pastReceipts } = await supabase
           .from('receipts')
           .select('id, image_hash, ai_raw_text, ai_store_name, ai_original_price, ai_expiry_date')
           .eq('user_id', userId)
           .neq('id', receiptId)
           .order('created_at', { ascending: false })
           .limit(50);

        if (pastReceipts && pastReceipts.length > 0) {
           for (const pr of pastReceipts) {
              // Rule 1: Exact Hash = 1.0
              if (input.imageHash && pr.image_hash === input.imageHash) {
                 duplicateScore = 1.0;
                 duplicateReceiptId = String(pr.id);
                 break;
              }
              // Rule 2: OCR text similarity > 90% = 0.9
              if (aiResult.raw_text && pr.ai_raw_text) {
                 const sim = getTextSimilarity(aiResult.raw_text, pr.ai_raw_text);
                 if (sim > 0.90 && sim > duplicateScore) {
                    duplicateScore = 0.9;
                    duplicateReceiptId = String(pr.id);
                 }
              }
              // Rule 3: Same Store, Price, Expiry = 0.8
              if (
                 aiResult.store_name && pr.ai_store_name && aiResult.store_name === pr.ai_store_name &&
                 aiResult.original_price && pr.ai_original_price && aiResult.original_price === pr.ai_original_price &&
                 aiResult.expiry_date && pr.ai_expiry_date && aiResult.expiry_date === pr.ai_expiry_date
              ) {
                 if (0.8 > duplicateScore) {
                    duplicateScore = 0.8;
                    duplicateReceiptId = String(pr.id);
                 }
              }
           }
        }

        if (duplicateScore >= 0.8) {
           console.log('[Duplicate Detection] WARNING: Possible duplicate detected');
        }
        console.log('[Duplicate Detection] Image hash:', input.imageHash);
        console.log('[Duplicate Detection] Duplicate score:', duplicateScore);
        console.log('[Duplicate Detection] Matched receipt ID:', duplicateReceiptId);

        // --- AI AUTO DECISION LOGIC ---
        let aiDecision: 'approve' | 'review' | 'reject' = 'review';
        if (duplicateScore >= 0.95) {
           aiDecision = 'reject';
        } else if (aiResult.confidence >= 0.9 && aiResult.red_label === true) {
           aiDecision = 'approve';
        } else if (aiResult.confidence >= 0.85 && duplicateScore < 0.5) {
           aiDecision = 'approve';
        }

        console.log('[AI Auto Decision] Decision:', aiDecision);

        // --- FETCH AUTO-APPROVE SETTING ---
        const { data: settingData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ai_auto_approve_enabled')
          .maybeSingle();

        const isAutoEnabled = settingData?.value === "true" || settingData?.value === true;
        console.log('[AI Auto Decision] AI Auto Approval Enabled:', isAutoEnabled);

        // --- PREPARE UPDATE PAYLOAD ---
        const updatePayload: any = {
          ai_store_name: aiResult.store_name,
          ai_product_name: aiResult.product_name,
          ai_original_price: aiResult.original_price,
          ai_discount_price: aiResult.discount_price,
          ai_discount_percent: aiResult.discount_percent,
          ai_expiry_date: aiResult.expiry_date,
          ai_red_label: aiResult.red_label,
          ai_suggested_ticket_reward: aiResult.suggested_ticket_reward,
          ai_confidence: aiResult.confidence,
          ai_raw_text: aiResult.raw_text,
          image_hash: input.imageHash,
          ai_duplicate_score: duplicateScore,
          ai_duplicate_receipt_id: duplicateReceiptId,
          ai_auto_decision: aiDecision
        };

        // --- EXECUTE AI AUTOMATION ---
        if (isAutoEnabled) {
           if (aiDecision === 'approve') {
              console.log('[AI Auto Decision] Auto-approving receipt');
              updatePayload.status = 'approved';
              updatePayload.approved_at = new Date().toISOString();
              updatePayload.approved_by = 'ai-system';
              updatePayload.cuan_reward = 0;
              updatePayload.ticket_reward = aiResult.suggested_ticket_reward || 0;
              updatePayload.ai_auto_processed = true;
              updatePayload.ai_processed_at = new Date().toISOString();
              updatePayload.ai_processing_reason = 'High confidence & low duplicate score';

              // Grant Tickets securely
              if (aiResult.suggested_ticket_reward && aiResult.suggested_ticket_reward > 0) {
                 const { data: profile } = await supabase
                    .from('survey_profiles')
                    .select('user_id, total_tickets')
                    .eq('user_id', userId)
                    .single();
                 
                 await supabase
                    .from('survey_profiles')
                    .update({
                       total_tickets: (profile?.total_tickets || 0) + aiResult.suggested_ticket_reward
                    })
                    .eq('user_id', userId);
                 console.log(`[AI Auto Decision] Granted ${aiResult.suggested_ticket_reward} tickets to user`);
              }
           } else if (aiDecision === 'reject') {
              console.log('[AI Auto Decision] Auto-rejecting receipt');
              updatePayload.status = 'rejected';
              updatePayload.rejected_at = new Date().toISOString();
              updatePayload.rejected_reason = 'duplicate_or_low_confidence';
              updatePayload.ai_auto_processed = true;
              updatePayload.ai_processed_at = new Date().toISOString();
              updatePayload.ai_processing_reason = duplicateScore >= 0.95 ? 'Duplicate exact match' : 'Poor confidence score';
           }
        }

        console.log('[OCR] update payload', {
          ai_store_name: updatePayload.ai_store_name,
          ai_product_name: updatePayload.ai_product_name,
          ai_original_price: updatePayload.ai_original_price,
          ai_discount_price: updatePayload.ai_discount_price,
          ai_confidence: updatePayload.ai_confidence,
          ai_raw_text: updatePayload.ai_raw_text
        });

        const { error: updateError } = await supabase
          .from('receipts')
          .update(updatePayload)
          .eq('id', receiptId);

        if (updateError) {
          console.error("[AI Auto Decision] Receipt AI update error:", updateError);
        } else {
          console.log('[AI Auto Decision] Receipt AI update success');
          const { data: dbRow } = await supabase.from('receipts').select('*').eq('id', receiptId).single();
          console.log('[OCR] DB values after update', dbRow);
        }
      } catch (ocrError) {
        console.error('[OCR] failed', ocrError);
        // Do not block the upload flow if OCR fails
      }

      return { receipt: { id: receiptId } as ReceiptRow, remaining: result.remaining };
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
    onError: (error, variables) => {
      if (isDailyLimitError(error)) {
        queryClient.setQueryData([...RECEIPTS_QUERY_KEY, "today", variables.userId], DAILY_RECEIPT_LIMIT);
        queryClient.invalidateQueries({ queryKey: [...RECEIPTS_QUERY_KEY, "today", variables.userId] });
      }
    },
  });
}

export function useApproveReceiptWithRewards() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      receipt,
      cuanReward,
      ticketReward,
    }: {
      receipt: ReceiptRow;
      cuanReward: number;
      ticketReward: number;
    }) => {
      console.log('[Approve] Starting approval for receipt', receipt.id, '| user:', receipt.user_id);

      // --- Step 1: Read current user_stats.tiket (this is what the UI shows) ---
      const { data: stats, error: statsReadError } = await supabase
        .from('user_stats')
        .select('tiket')
        .eq('user_id', receipt.user_id)
        .maybeSingle();

      if (statsReadError) {
        console.error('[Approve] Failed to read user_stats:', statsReadError);
      }

      const currentTiket = stats?.tiket ?? 0;
      console.log('[Approve] Current tiket in user_stats:', currentTiket, '| Adding:', ticketReward);

      // --- Step 2: Write to user_stats.tiket (primary ticket store read by UI) ---
      const { error: statsUpdateError } = await supabase
        .from('user_stats')
        .update({ tiket: currentTiket + ticketReward })
        .eq('user_id', receipt.user_id);

      if (statsUpdateError) {
        console.error('[Approve] Failed to update user_stats.tiket:', statsUpdateError);
        throw statsUpdateError;
      }
      console.log('[Approve] user_stats.tiket updated to', currentTiket + ticketReward);

      // --- Step 3: Also sync to survey_profiles.total_tickets (secondary store) ---
      try {
        const { data: profile } = await supabase
          .from('survey_profiles')
          .select('total_tickets')
          .eq('user_id', receipt.user_id)
          .maybeSingle();

        await supabase
          .from('survey_profiles')
          .update({ total_tickets: (profile?.total_tickets ?? 0) + ticketReward })
          .eq('user_id', receipt.user_id);

        console.log('[Approve] survey_profiles.total_tickets synced');
      } catch (spErr) {
        // Non-fatal: UI doesn't read from here
        console.warn('[Approve] survey_profiles sync failed (non-fatal):', spErr);
      }

      // --- Step 4: Update the receipt row ---
      console.log('[Approve] Updating receipt status to approved');
      const { error: receiptError } = await supabase
        .from('receipts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          ticket_reward: ticketReward,
        })
        .eq('id', receipt.id);

      if (receiptError) {
        console.error('[Approve] Receipt update failed:', receiptError);
        throw receiptError;
      }
      console.log('[Approve] Done. Receipt approved, tickets granted:', ticketReward);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['user_stats'] });
      queryClient.invalidateQueries({ queryKey: ['user_tickets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      invalidateLotteryPoolQueries(queryClient);
    },
  });
}

export function useRejectReceipt() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (receiptId: string | number) => {
      const { error } = await supabase
        .from('receipts')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', receiptId);

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

