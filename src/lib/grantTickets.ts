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

  // ── Step 1: Read current user_stats.tiket ──
  const { data: currentUserStats, error: statsReadError } = await supabase
    .from('user_stats')
    .select('tiket')
    .eq('user_id', userId)
    .maybeSingle();

  if (statsReadError) {
    console.error('[grantTickets] user_stats read error', statsReadError);
    throw new Error('Failed to read user stats: ' + statsReadError.message);
  }

  const currentTiket = currentUserStats?.tiket ?? 0;
  console.log('[grantTickets] user_stats before', { tiket: currentTiket });

  const newTotal = currentTiket + amount;

  // ── Step 2: Update user_stats.tiket (PRIMARY — UI reads this) ──
  const { error: statsUpdateError } = await supabase
    .from('user_stats')
    .update({ tiket: newTotal })
    .eq('user_id', userId);

  if (statsUpdateError) {
    console.error('[grantTickets] user_stats update error', statsUpdateError);
    throw new Error('Failed to update user_stats.tiket: ' + statsUpdateError.message);
  }

  console.log('[grantTickets] user_stats.tiket updated', { previous: currentTiket, new: newTotal });

  // ── Step 3: Also update survey_profiles.total_tickets (SECONDARY — keep in sync) ──
  try {
    const { data: currentProfile, error: profileReadError } = await supabase
      .from('survey_profiles')
      .select('total_tickets')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileReadError) {
      console.warn('[grantTickets] survey_profiles read error (non-fatal)', profileReadError);
    } else {
      const currentProfileTickets = currentProfile?.total_tickets ?? 0;
      console.log('[grantTickets] survey_profiles before', { total_tickets: currentProfileTickets });

      const { error: profileUpdateError } = await supabase
        .from('survey_profiles')
        .update({ total_tickets: currentProfileTickets + amount })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.warn('[grantTickets] survey_profiles update error (non-fatal)', profileUpdateError);
      } else {
        console.log('[grantTickets] survey_profiles.total_tickets updated', {
          previous: currentProfileTickets,
          new: currentProfileTickets + amount,
        });
      }
    }
  } catch (spErr) {
    console.warn('[grantTickets] survey_profiles sync failed (non-fatal)', spErr);
  }

  console.log('[grantTickets] new total', newTotal);
  console.log('[grantTickets] success');

  // ── Step 4: Invalidate all ticket-related queries ──
  invalidateTicketQueries(queryClient);

  return newTotal;
}

/**
 * Standard set of query keys to invalidate after any ticket-granting action.
 * Call invalidateTicketQueries(queryClient) after every grantTickets() call.
 */
export const TICKET_QUERY_KEYS = [
  ['user_stats'],
  ['survey-profile'],
  ['user_tickets'],
  ['weekly-draw'],
  ['weeklyDraw', 'lotteryTicketsCount'],
  ['user_stats_shake'],
  ['home'],
  ['receipts'],
  ['deals'],
] as const;

/**
 * Invalidate all ticket-related queries in one call.
 * Import and use after every grantTickets().
 */
export function invalidateTicketQueries(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly string[] }) => void;
}) {
  for (const key of TICKET_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
