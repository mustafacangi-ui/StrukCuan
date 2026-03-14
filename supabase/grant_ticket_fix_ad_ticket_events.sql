-- Fix grant_ticket: insert into ad_ticket_events (not ticket_events)
-- useTodayRewardedTickets reads from ad_ticket_events to calculate adsWatched
-- Run in Supabase SQL Editor
--
-- RLS: grant_ticket uses SECURITY DEFINER (bypasses RLS for insert).
-- ad_ticket_events policy "Users can insert own" exists but RPC bypasses it.
-- ad_ticket_events policy "Users can read own" allows SELECT for auth.uid() = user_id.

-- 1) Allow 'rewarded' event_type in ad_ticket_events
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));

-- 2) Trigger: skip 'rewarded' (grant_ticket handles user_stats)
create or replace function public.on_ad_ticket_earned()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.event_type = 'rewarded' then
    return new;
  end if;
  insert into public.user_stats (user_id, tiket)
  values (new.user_id::text, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();
  begin
    insert into public.notifications (user_id, title, message)
    values (new.user_id::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification insert failed: %', sqlerrm;
  end;
  return new;
end;
$$;

-- 3) grant_ticket: insert into ad_ticket_events, update user_stats (daily limit 10)
create or replace function public.grant_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  v_date_id text;
  v_count integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');

  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and week_id = v_date_id;

  if v_count >= 10 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  insert into public.user_stats (user_id, tiket)
  values (uid::text, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
