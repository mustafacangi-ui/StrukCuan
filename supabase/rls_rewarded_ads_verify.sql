-- RLS verification for rewarded ads system
-- Run in Supabase SQL Editor if you see 404 or "Failed to fetch user_stats" errors
--
-- Expected schema:
-- - ad_ticket_events: user_id (uuid), event_type (text), week_id (text), created_at
-- - user_stats: user_id (text), tiket (int), ...
-- - grant_ticket RPC: inserts into ad_ticket_events, updates user_stats

-- 1) Ensure ad_ticket_events has correct RLS (users can SELECT own rows)
alter table if exists public.ad_ticket_events enable row level security;

drop policy if exists "Users can read own ad_ticket_events" on public.ad_ticket_events;
create policy "Users can read own ad_ticket_events"
  on public.ad_ticket_events for select
  using (auth.uid() = user_id);

-- 2) Ensure user_stats has correct RLS (users can SELECT own row)
alter table if exists public.user_stats enable row level security;

drop policy if exists "Users select own stats" on public.user_stats;
drop policy if exists "Users can read user_stats" on public.user_stats;
create policy "Users can read own user_stats"
  on public.user_stats for select
  to authenticated
  using (user_id = auth.uid()::text);

-- 3) grant_ticket RPC uses SECURITY DEFINER - bypasses RLS for INSERT/UPDATE
-- Ensure it exists and has execute permission:
-- grant execute on function public.grant_ticket() to authenticated;
