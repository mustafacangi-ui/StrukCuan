-- =============================================================================
-- StrukCuan: RESET Ticket System - Clean Rebuild
-- Run in Supabase SQL Editor. This replaces all broken ticket migrations.
-- =============================================================================
--
-- Rules:
-- - Every 5 ads watched = 1 ticket (5, 10, 15)
-- - Max 3 tickets per day = 15 ads per day
-- - Tickets stored per week for weekly draw
-- - Asia/Jakarta timezone
--
-- =============================================================================

-- 1) REMOVE BROKEN OBJECTS
-- =============================================================================
drop function if exists public.grant_ticket();
drop function if exists public.upsert_user_ticket(text, integer, integer);
drop function if exists public.upsert_user_ticket(uuid, integer, integer);
drop trigger if exists ad_ticket_events_reward_trigger on public.ad_ticket_events;
drop function if exists public.on_ad_ticket_earned();

-- 2) AD_TICKET_EVENTS - ensure table exists and allows 'rewarded'
-- =============================================================================
-- Table should exist; we only fix the event_type constraint
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));

-- 3) USER_STATS - ensure tiket column exists
-- =============================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket') then
    alter table public.user_stats add column tiket integer not null default 0;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_stats' and column_name = 'ticket')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket') then
    alter table public.user_stats rename column ticket to tiket;
  end if;
end
$$;

-- 4) USER_TICKETS - drop and recreate clean (user_id uuid to match auth.uid())
-- =============================================================================
drop table if exists public.user_tickets cascade;
create table public.user_tickets (
  user_id uuid not null references auth.users(id) on delete cascade,
  draw_week integer not null,
  tickets integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, draw_week)
);
create index user_tickets_draw_week_idx on public.user_tickets (draw_week);
alter table public.user_tickets enable row level security;
drop policy if exists "Users can read own user_tickets" on public.user_tickets;
create policy "Users can read own user_tickets" on public.user_tickets
  for select to authenticated using (user_id = auth.uid());

-- 5) LOTTERY_TICKETS - for weekly draw pool (user_id uuid to match auth.uid())
-- =============================================================================
drop table if exists public.lottery_tickets cascade;
create table public.lottery_tickets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  draw_week integer not null,
  created_at timestamptz default now()
);
create index lottery_tickets_draw_week_idx on public.lottery_tickets (draw_week);
alter table public.lottery_tickets enable row level security;
drop policy if exists "Users can read lottery_tickets" on public.lottery_tickets;
create policy "Users can read lottery_tickets" on public.lottery_tickets for select to authenticated using (true);

-- 6) UPSERT_USER_TICKET - (uuid, integer, integer) to avoid uuid/text mismatch
-- =============================================================================
create or replace function public.upsert_user_ticket(p_user_id uuid, p_draw_week integer, p_add integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_tickets (user_id, draw_week, tickets, updated_at)
  values (p_user_id, p_draw_week, least(p_add, 40), now())
  on conflict (user_id, draw_week)
  do update set tickets = least(public.user_tickets.tickets + p_add, 40), updated_at = now();
end;
$$;

-- 7) GRANT_TICKET - main RPC
-- =============================================================================
create or replace function public.grant_ticket()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  v_date_id text;
  v_count integer;
  v_draw_week integer;
  v_tickets_to_add integer := 0;
  v_today_start timestamptz;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  -- Today start in Asia/Jakarta
  v_today_start := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Count today's ads (created_at only)
  select count(*)::integer into v_count from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and created_at >= v_today_start;

  if v_count >= 15 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  -- Insert ad event
  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  -- Every 5 ads = 1 ticket (5, 10, 15)
  v_count := v_count + 1;
  if v_count = 5 or v_count = 10 or v_count = 15 then
    v_tickets_to_add := 1;
  end if;

  if v_tickets_to_add > 0 then
    -- user_stats.tiket (user_stats.user_id is text)
    insert into public.user_stats (user_id, tiket) values (uid::text, v_tickets_to_add)
    on conflict (user_id) do update set tiket = public.user_stats.tiket + v_tickets_to_add, updated_at = now();

    -- user_tickets + lottery_tickets (user_id uuid - pass uid directly)
    if coalesce((select tickets from public.user_tickets where user_id = uid and draw_week = v_draw_week), 0) < 40 then
      perform public.upsert_user_ticket(uid, v_draw_week, v_tickets_to_add);
      insert into public.lottery_tickets (user_id, draw_week)
      select uid, v_draw_week from generate_series(1, v_tickets_to_add);
    end if;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
