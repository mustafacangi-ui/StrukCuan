import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

/**
 * grantTickets — Single source of truth for all ticket rewards in the app.
 *
 * Updates BOTH:
 *   1. user_stats.tiket      (primary — what the UI reads)
 *   2. survey_profiles.total_tickets (secondary — legacy/sync)
 *
 * @param userId  The target user's UUID
 * @param amount  Number of tickets to add (must be > 0)
 * @returns       The new ticket total from user_stats.tiket
 */
export async function grantTickets(userId: string, amount: number): Promise<number> {
  console.log('[grantTickets] start', { userId, amount });

  if (!userId || amount <= 0) {
    const msg = `[grantTickets] invalid params: userId=${userId}, amount=${amount}`;
    console.error(msg);
    throw new Error(msg);
  }

  try {
    // ── Step 1: Read current user_stats.tiket ──
    const { data: currentUserStats, error: statsReadError } = await supabase
      .from('user_stats')
      .select('tiket')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsReadError) {
      console.error('[grantTickets] error fetching stats', statsReadError);
      throw new Error('Failed to read user stats: ' + statsReadError.message);
    }

    console.log('[grantTickets] user_stats before', currentUserStats);

    // Also fetch current profile for logging as requested
    const { data: currentProfile } = await supabase
      .from('survey_profiles')
      .select('total_tickets')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log('[grantTickets] survey_profiles before', currentProfile);

    const currentTickets = currentUserStats?.tiket ?? 0;
    const newTotal = currentTickets + amount;
    console.log('[grantTickets] new total', newTotal);

    // ── Step 2: Update BOTH tables — Single Source of Truth ──
    // 1. Update user_stats.tiket
    const { error: statsUpdateError } = await supabase
      .from('user_stats')
      .update({ tiket: newTotal })
      .eq('user_id', userId);

    if (statsUpdateError) {
      console.error('[grantTickets] user_stats update error', statsUpdateError);
      throw new Error('Failed to update user_stats.tiket: ' + statsUpdateError.message);
    }

    // 2. Update survey_profiles.total_tickets
    const { error: profileUpdateError } = await supabase
      .from('survey_profiles')
      .update({ total_tickets: newTotal })
      .eq('user_id', userId);

    if (profileUpdateError) {
      console.warn('[grantTickets] survey_profiles update error (non-fatal)', profileUpdateError);
      // We don't throw here to ensure the primary update stands, but it will be logged
    }

    console.log('[grantTickets] success');

    // ── Step 3: Invalidate all ticket-related queries ──
    invalidateTicketQueries(queryClient);

    return newTotal;
  } catch (error) {
    console.log('[grantTickets] error', error);
    throw error;
  }
}

/**
 * Standard set of query keys to invalidate after any ticket-granting action.
 */
export const TICKET_QUERY_KEYS = [
  ['user_stats'],
  ['user-stats'],
  ['survey-profile'],
  ['user_tickets'],
  ['user-tickets'],
  ['weekly-draw'],
  ['weeklyDraw', 'lotteryTicketsCount'],
  ['user_stats_shake'],
  ['home'],
  ['receipts'],
  ['deals'],
] as const;

/**
 * Invalidate all ticket-related queries in one call.
 */
export function invalidateTicketQueries(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly string[] }) => void;
}) {
  for (const key of TICKET_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
