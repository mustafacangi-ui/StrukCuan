-- Full fix for grant_ticket + ad_ticket_events + RLS
-- Run in Supabase SQL Editor. Fixes ticket counter stuck at 0/10.
--
-- 1) grant_ticket uses SECURITY DEFINER → bypasses RLS for INSERT
-- 2) Trigger skips 'rewarded' (grant_ticket handles user_stats)
-- 3) RAISE NOTICE for debugging (check Supabase Dashboard → Logs)

-- Allow 'rewarded' event_type
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));

-- Trigger: skip 'rewarded', wrap notifications in exception
create or replace function public.on_ad_ticket_earned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'rewarded' then
    return new;
  end if;
  begin
    insert into public.user_stats (user_id, tiket)
    values ((new.user_id)::text, 1)
    on conflict (user_id)
    do update set tiket = public.user_stats.tiket + 1, updated_at = now();
  exception when others then
    raise warning 'user_stats failed: %', sqlerrm;
  end;
  begin
    insert into public.notifications (user_id, title, message)
    values ((new.user_id)::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification failed (ticket still granted): %', sqlerrm;
  end;
  return new;
end;
$$;

-- Ensure trigger exists
drop trigger if exists ad_ticket_events_reward_trigger on public.ad_ticket_events;
create trigger ad_ticket_events_reward_trigger
  after insert on public.ad_ticket_events
  for each row execute function public.on_ad_ticket_earned();

-- grant_ticket RPC with RAISE NOTICE for debugging
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
  raise notice 'grant_ticket: uid=%, week_id=%', uid, v_date_id;

  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and week_id = v_date_id;

  if v_count >= 10 then
    raise notice 'grant_ticket: DAILY_LIMIT_REACHED for uid=%', uid;
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);
  raise notice 'grant_ticket: inserted ad_ticket_events for uid=%', uid;

  insert into public.user_stats (user_id, tiket)
  values (uid::text, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();
  raise notice 'grant_ticket: updated user_stats for uid=%', uid;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;

-- RLS: users can SELECT own ad_ticket_events (for counter display)
alter table if exists public.ad_ticket_events enable row level security;
drop policy if exists "Users can read own ad_ticket_events" on public.ad_ticket_events;
create policy "Users can read own ad_ticket_events"
  on public.ad_ticket_events for select
  using ((auth.uid())::uuid = (user_id)::uuid);
