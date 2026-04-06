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
    // ── Step 1: Read current user_stats and survey_profiles ──
    const { data: userStatsBefore } = await supabase
      .from('user_stats')
      .select('user_id, tiket')
      .eq('user_id', userId)
      .maybeSingle(); // Using maybeSingle to handle the "if not exist" logic safely

    console.log('[grantTickets] userStatsBefore', userStatsBefore);

    const { data: surveyProfileBefore } = await supabase
      .from('survey_profiles')
      .select('user_id, total_tickets')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[grantTickets] surveyProfileBefore', surveyProfileBefore);

    // ── Step 2: Auto-create rows if they do not exist ──
    if (!userStatsBefore) {
      console.log('[grantTickets] user_stats missing, creating...');
      await supabase.from('user_stats').insert({
        user_id: userId,
        tiket: amount
      });
    }

    if (!surveyProfileBefore) {
      console.log('[grantTickets] survey_profiles missing, creating...');
      await supabase.from('survey_profiles').insert({
        user_id: userId,
        total_tickets: amount
      });
    }

    const currentTickets = userStatsBefore?.tiket ?? 0;
    const newTotal = currentTickets + amount;
    console.log('[grantTickets] calculated new total', newTotal);

    // ── Step 3: Update BOTH tables — Single Source of Truth ──
    // 1. Update user_stats.tiket
    if (userStatsBefore) {
      const { error: statsUpdateError } = await supabase
        .from('user_stats')
        .update({ tiket: newTotal })
        .eq('user_id', userId);

      if (statsUpdateError) {
        console.error('[grantTickets] user_stats update error', statsUpdateError);
        throw new Error('Failed to update user_stats.tiket: ' + statsUpdateError.message);
      }
    }

    // 2. Update survey_profiles.total_tickets
    if (surveyProfileBefore) {
      const { error: profileUpdateError } = await supabase
        .from('survey_profiles')
        .update({ total_tickets: newTotal })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.warn('[grantTickets] survey_profiles update error (non-fatal)', profileUpdateError);
      }
    }

    // ── Step 4: Verify results ──
    const { data: userStatsAfter } = await supabase
      .from('user_stats')
      .select('user_id, tiket')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: surveyProfileAfter } = await supabase
      .from('survey_profiles')
      .select('user_id, total_tickets')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[grantTickets] userStatsAfter', userStatsAfter);
    console.log('[grantTickets] surveyProfileAfter', surveyProfileAfter);

    console.log('[grantTickets] success');

    // Invalidate all ticket-related queries
    invalidateTicketQueries(queryClient);

    return userStatsAfter?.tiket ?? newTotal;
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
