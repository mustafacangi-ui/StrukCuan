-- RLS verification for rewarded ads system
-- Run in Supabase SQL Editor if you see 404 or "Failed to fetch user_stats" errors
--
-- Explicit type casts to avoid "operator does not exist: uuid = text" errors.
-- ad_ticket_events.user_id: uuid
-- user_stats.user_id: text

-- 1) ad_ticket_events RLS (user_id is uuid, auth.uid() is uuid)
alter table if exists public.ad_ticket_events enable row level security;

drop policy if exists "Users can read own ad_ticket_events" on public.ad_ticket_events;
create policy "Users can read own ad_ticket_events"
  on public.ad_ticket_events for select
  using ((auth.uid())::uuid = (user_id)::uuid);

drop policy if exists "Users can insert own ad_ticket_events" on public.ad_ticket_events;
create policy "Users can insert own ad_ticket_events"
  on public.ad_ticket_events for insert
  with check ((auth.uid())::uuid = (user_id)::uuid);

-- 2) user_stats RLS (user_id is text, auth.uid() is uuid → cast to text)
alter table if exists public.user_stats enable row level security;

drop policy if exists "Users select own stats" on public.user_stats;
drop policy if exists "Users can read user_stats" on public.user_stats;
drop policy if exists "Users can read own user_stats" on public.user_stats;
create policy "Users can read own user_stats"
  on public.user_stats for select
  to authenticated
  using ((user_id)::text = (auth.uid())::text);
