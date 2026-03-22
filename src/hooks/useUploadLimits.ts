/**
 * Upload limit hooks — frontend daily-limit checks.
 *
 * Receipt limits are already tracked via useReceiptsToday (receipts table).
 * This file adds the equivalent for red-label (deals) uploads.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Maximum receipt uploads per user per calendar day. Server-enforced. */
export const DAILY_RECEIPT_LIMIT = 3;

/** @deprecated Use DAILY_RECEIPT_LIMIT. Kept for backwards compatibility. */
export const DAILY_RECEIPT_TICKET_LIMIT = DAILY_RECEIPT_LIMIT;

export const MAX_RED_LABELS_PER_DAY = 3;

/**
 * Ticket schedule for normal receipt scans.
 *
 *  Scan 1–3 (todayCount 0–2) → +1 ticket each
 *  Scan 4+  (todayCount ≥ 3) →  0 tickets  (daily limit reached)
 *
 * Red Label uses its own separate 3→2→1→0 schedule.
 *
 * @param todayCount  Number of receipts already uploaded today (BEFORE this scan).
 */
export function getReceiptTicketsForScan(todayCount: number): number {
  return todayCount < DAILY_RECEIPT_LIMIT ? 1 : 0;
}

/** Remaining receipt uploads allowed today. */
export function getRemainingReceiptsToday(todayCount: number): number {
  return Math.max(0, DAILY_RECEIPT_LIMIT - todayCount);
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchRedLabelsTodayCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart());

  if (error) {
    console.warn("[useUploadLimits] red-labels today query failed:", error);
    return 0;
  }
  return count ?? 0;
}

export const RED_LABELS_TODAY_KEY = ["red_labels_today"] as const;

export function useRedLabelsToday(userId: string | undefined) {
  return useQuery({
    queryKey: [...RED_LABELS_TODAY_KEY, userId],
    queryFn: () => fetchRedLabelsTodayCount(userId!),
    enabled: !!userId,
    staleTime: 30_000, // re-check at most every 30 s
  });
}
