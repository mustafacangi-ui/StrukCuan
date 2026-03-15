-- =============================================================================
-- Add get_today_rewarded_count RPC for progress bar
-- Run in Supabase SQL Editor if progress counter stays at 0/5 after ads.
-- =============================================================================
-- This RPC bypasses RLS and uses the same date logic as grant_ticket (Asia/Jakarta).
-- The frontend uses this for the "ADS WATCHED X/5" counter.

create or replace function public.get_today_rewarded_count()
returns integer language sql security definer set search_path = public stable as $$
  select count(*)::integer from public.ad_ticket_events
  where user_id = auth.uid()
    and event_type = 'rewarded'
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta');
$$;
grant execute on function public.get_today_rewarded_count() to authenticated;

-- Ensure ad_ticket_events RLS allows users to read own rows (fallback)
alter table if exists public.ad_ticket_events enable row level security;
drop policy if exists "Users can read own ad_ticket_events" on public.ad_ticket_events;
create policy "Users can read own ad_ticket_events" on public.ad_ticket_events
  for select to authenticated using (user_id = auth.uid());
