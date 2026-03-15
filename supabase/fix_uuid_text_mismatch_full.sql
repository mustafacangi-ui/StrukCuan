-- =============================================================================
-- StrukCuan: FIX uuid/text mismatch - FULL migration
-- Run in Supabase SQL Editor. Fixes "column user_id is of type uuid but expression is of type text"
-- =============================================================================
--
-- Ensures: user_id is uuid everywhere, auth.uid() passed as uuid, NO ::text casts
--
-- =============================================================================

-- 1) REMOVE BROKEN OBJECTS
-- =============================================================================
drop function if exists public.grant_ticket();
drop function if exists public.upsert_user_ticket(text, integer, integer);
drop function if exists public.upsert_user_ticket(uuid, integer, integer);
drop trigger if exists ad_ticket_events_reward_trigger on public.ad_ticket_events;
drop function if exists public.on_ad_ticket_earned();
-- Note: on_ad_ticket_earned recreated below for wednesday/sunday/monetag events

-- 2) USER_STATS - alter user_id to uuid, ensure tiket exists
-- =============================================================================
-- Convert user_stats.user_id from text to uuid so we pass auth.uid() directly (no ::text)
do $$
begin
  if (select data_type from information_schema.columns where table_schema='public' and table_name='user_stats' and column_name='user_id') = 'text' then
    alter table public.user_stats alter column user_id type uuid using user_id::uuid;
    raise notice 'user_stats.user_id converted to uuid';
  end if;
exception when others then
  raise notice 'user_stats alter skipped: %', sqlerrm;
end
$$;
alter table public.user_stats add column if not exists tiket integer not null default 0;
alter table public.user_stats add column if not exists updated_at timestamptz default now();

-- 3) AD_TICKET_EVENTS - allow 'rewarded', recreate trigger for wednesday/sunday/monetag
-- =============================================================================
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));

create or replace function public.on_ad_ticket_earned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.event_type = 'rewarded' then
    return new;  -- grant_ticket RPC handles these
  end if;
  begin
    insert into public.user_stats (user_id, tiket)
    values (new.user_id, 1)
    on conflict (user_id) do update set tiket = public.user_stats.tiket + 1, updated_at = now();
  exception when others then
    raise warning 'user_stats insert failed (ticket still granted): %', sqlerrm;
  end;
  begin
    insert into public.notifications (user_id, title, message)
    values (new.user_id::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification insert failed (ticket still granted): %', sqlerrm;
  end;
  return new;
end;
$$;
create trigger ad_ticket_events_reward_trigger
  after insert on public.ad_ticket_events
  for each row execute function public.on_ad_ticket_earned();

-- 4) USER_TICKETS - drop and recreate with user_id uuid
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

-- 5) LOTTERY_TICKETS - drop and recreate with user_id uuid
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

-- 6) UPSERT_USER_TICKET - accepts uuid only
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

-- 7) GRANT_TICKET - uuid everywhere, NO ::text casts for user_id
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

  v_today_start := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select count(*)::integer into v_count from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and created_at >= v_today_start;

  if v_count >= 15 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  v_count := v_count + 1;
  if v_count = 5 or v_count = 10 or v_count = 15 then
    v_tickets_to_add := 1;
  end if;

  if v_tickets_to_add > 0 then
    -- user_stats: user_id uuid - pass uid directly (no ::text)
    insert into public.user_stats (user_id, tiket) values (uid, v_tickets_to_add)
    on conflict (user_id) do update set tiket = public.user_stats.tiket + v_tickets_to_add, updated_at = now();

    -- user_tickets + lottery_tickets: user_id uuid (uid passed directly)
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

-- 8) APPROVE_RECEIPT - pass uuid to user_stats (receipts.user_id is text)
-- =============================================================================
create or replace function public.approve_receipt(p_receipt_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id text;
begin
  select user_id into v_user_id from public.receipts
  where id = p_receipt_id and status = 'pending' for update;
  if v_user_id is null then
    raise exception 'Receipt not found or not pending';
  end if;
  update public.receipts set status = 'approved' where id = p_receipt_id;
  insert into public.user_stats (user_id, cuan, tiket)
  values (v_user_id::uuid, 50, 1)
  on conflict (user_id) do update set cuan = public.user_stats.cuan + 50, tiket = public.user_stats.tiket + 1, updated_at = now();
  insert into public.notifications (user_id, title, message)
  values (v_user_id, 'Receipt Approved', 'Your receipt has been approved. You earned +50 cuan and +1 ticket.');
end;
$$;

-- 9) APPROVE_RECEIPT_WITH_REWARDS - pass uuid to user_stats, user_tickets, lottery_tickets
-- =============================================================================
-- receipts.user_id is text; cast to uuid when inserting into uuid columns
create or replace function public.approve_receipt_with_rewards(
  p_receipt_id bigint,
  p_cuan integer default 50,
  p_tiket integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_user_uuid uuid;
  v_draw_week integer;
  v_cur integer;
  v_add integer;
  i integer;
begin
  select user_id into v_user_id
  from public.receipts
  where id = p_receipt_id and status = 'pending'
  for update;

  if v_user_id is null then
    raise exception 'Receipt not found or not pending';
  end if;

  v_user_uuid := v_user_id::uuid;
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select coalesce(tickets, 0) into v_cur from public.user_tickets where user_id = v_user_uuid and draw_week = v_draw_week;

  update public.receipts
  set status = 'approved'
  where id = p_receipt_id;

  insert into public.user_stats (user_id, cuan, tiket)
  values (v_user_uuid, p_cuan, p_tiket)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + p_cuan,
    tiket = public.user_stats.tiket + p_tiket,
    updated_at = now();

  perform public.upsert_user_ticket(v_user_uuid, v_draw_week, p_tiket);

  v_add := least(p_tiket, greatest(0, 40 - v_cur));
  for i in 1..v_add loop
    insert into public.lottery_tickets (user_id, draw_week) values (v_user_uuid, v_draw_week);
  end loop;

  insert into public.notifications (user_id, title, message)
  values (
    v_user_id,
    'Receipt Approved',
    'Your receipt has been approved. You earned +' || p_cuan || ' cuan and +' || p_tiket || ' ticket.'
  );
end;
$$;

-- 10) RLS for user_stats (user_id uuid)
-- =============================================================================
drop policy if exists "Users select own stats" on public.user_stats;
drop policy if exists "Users can read own user_stats" on public.user_stats;
drop policy if exists "Users can read user_stats" on public.user_stats;
create policy "Users can read own user_stats" on public.user_stats for select to authenticated using (user_id = auth.uid());
