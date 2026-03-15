-- user_tickets: weekly ticket count per user (capped at 40 for draw)
-- Run in Supabase SQL Editor
--
-- Rules:
-- - Ads: max 3/day, 21/week
-- - Receipts: max 3/day, 21/week
-- - Draw participation: max 40 tickets per user per week

-- 0) Ensure lottery_tickets exists (for FOMO count)
create table if not exists public.lottery_tickets (
  id bigserial primary key,
  user_id text not null,
  draw_week integer not null,
  created_at timestamptz default now()
);
create index if not exists lottery_tickets_draw_week_idx on public.lottery_tickets (draw_week);

-- 1) Create user_tickets table
create table if not exists public.user_tickets (
  user_id text not null,
  draw_week integer not null,
  tickets integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, draw_week)
);

create index if not exists user_tickets_draw_week_idx on public.user_tickets (draw_week);

alter table public.user_tickets enable row level security;

create policy "Users can read own user_tickets"
  on public.user_tickets for select
  to authenticated
  using (user_id = auth.uid()::text);

-- 2) Helper: upsert user_tickets (cap at 40)
create or replace function public.upsert_user_ticket(p_user_id text, p_draw_week integer, p_add integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tickets (user_id, draw_week, tickets, updated_at)
  values (p_user_id, p_draw_week, least(p_add, 40), now())
  on conflict (user_id, draw_week)
  do update set
    tickets = least(public.user_tickets.tickets + p_add, 40),
    updated_at = now();
end;
$$;

-- 3) Update grant_ticket to also update user_tickets (capped 40)
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
  v_draw_week integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and week_id = v_date_id;

  if v_count >= 3 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  insert into public.user_stats (user_id, tiket)
  values (uid::text, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();

  if coalesce((select tickets from public.user_tickets where user_id = uid::text and draw_week = v_draw_week), 0) < 40 then
    perform public.upsert_user_ticket(uid::text, v_draw_week, 1);
    insert into public.lottery_tickets (user_id, draw_week) values (uid::text, v_draw_week);
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;

-- 4) Update approve_receipt_with_rewards to also update user_tickets
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

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select coalesce(tickets, 0) into v_cur from public.user_tickets where user_id = v_user_id and draw_week = v_draw_week;

  update public.receipts
  set status = 'approved'
  where id = p_receipt_id;

  insert into public.user_stats (user_id, cuan, tiket)
  values (v_user_id, p_cuan, p_tiket)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + p_cuan,
    tiket = public.user_stats.tiket + p_tiket,
    updated_at = now();

  perform public.upsert_user_ticket(v_user_id, v_draw_week, p_tiket);

  v_add := least(p_tiket, greatest(0, 40 - v_cur));
  for i in 1..v_add loop
    insert into public.lottery_tickets (user_id, draw_week) values (v_user_id, v_draw_week);
  end loop;

  insert into public.notifications (user_id, title, message)
  values (
    v_user_id,
    'Receipt Approved',
    'Your receipt has been approved. You earned +' || p_cuan || ' cuan and +' || p_tiket || ' ticket.'
  );
end;
$$;
