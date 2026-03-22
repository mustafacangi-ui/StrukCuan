/**
 * Upload limit hooks — frontend daily-limit checks.
 *
 * Receipt limits are already tracked via useReceiptsToday (receipts table).
 * This file adds the equivalent for red-label (deals) uploads.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Maximum uploads per user per calendar day. */
export const MAX_RECEIPTS_PER_DAY   = 5;
export const MAX_RED_LABELS_PER_DAY = 3;

/**
 * Maximum receipt scans that can earn tickets per day (same as Red Label cap).
 * Scans beyond this limit are still accepted and stored, but award 0 tickets.
 */
export const DAILY_RECEIPT_TICKET_LIMIT = 3;

/**
 * Decreasing ticket schedule for normal receipt scans — mirrors Red Label logic.
 *
 *  Scan 1 (todayCount === 0) → +3 tickets
 *  Scan 2 (todayCount === 1) → +2 tickets
 *  Scan 3 (todayCount === 2) → +1 ticket
 *  Scan 4+                   →  0 tickets  (daily limit reached)
 *
 * @param todayCount  Number of receipts already uploaded today (BEFORE this scan).
 */
export function getReceiptTicketsForScan(todayCount: number): number {
  if (todayCount === 0) return 3;
  if (todayCount === 1) return 2;
  if (todayCount === 2) return 1;
  return 0;
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
