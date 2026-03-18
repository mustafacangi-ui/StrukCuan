-- Earn page: Convert Cuan (100 → 1 Ticket) + Shake to Win (1-5 tickets, 1x/day)
-- Supabase SQL Editor'da çalıştırın.

-- 1) user_stats'a shake_last_at ekle (Shake to Win günlük limit)
alter table public.user_stats
  add column if not exists shake_last_at timestamptz;

-- 2) convert_cuan_to_ticket: 100 Cuan → 1 Ticket
create or replace function public.convert_cuan_to_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  v_draw_week integer;
  v_cuan integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  select coalesce(cuan, 0) into v_cuan
  from public.user_stats
  where user_id = uid::text;

  if v_cuan < 100 then
    raise exception 'INSUFFICIENT_CUAN' using errcode = 'P0001';
  end if;

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Deduct 100 cuan, add 1 tiket (ensure row exists)
  update public.user_stats
  set cuan = cuan - 100,
      tiket = coalesce(tiket, 0) + 1,
      updated_at = now()
  where user_id = uid::text;

  if not found then
    raise exception 'User stats not found' using errcode = 'P0001';
  end if;

  -- Add to weekly tickets (capped 42)
  perform public.upsert_user_ticket(uid::text, v_draw_week, 1);

  -- Add lottery ticket
  insert into public.lottery_tickets (user_id, draw_week)
  values (uid::text, v_draw_week);

  return jsonb_build_object('success', true, 'tickets_added', 1);
end;
$$;

-- 3) shake_to_win: random 1-5 tickets, once per day (Asia/Jakarta)
create or replace function public.shake_to_win()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  v_draw_week integer;
  v_tickets integer;
  v_last date;
  v_today date;
  v_current integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  v_today := (now() at time zone 'Asia/Jakarta')::date;
  select (shake_last_at at time zone 'Asia/Jakarta')::date into v_last
  from public.user_stats
  where user_id = uid::text;

  if v_last = v_today then
    raise exception 'SHAKE_ALREADY_USED' using errcode = 'P0001';
  end if;

  -- Random 1-5 tickets
  v_tickets := 1 + floor(random() * 5)::integer;
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Current weekly count
  select coalesce(tickets, 0) into v_current
  from public.user_tickets
  where user_id = uid::text and draw_week = v_draw_week;

  -- Cap at 42 total
  v_tickets := least(v_tickets, greatest(0, 42 - coalesce(v_current, 0)));

  if v_tickets <= 0 then
    raise exception 'WEEKLY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  -- Update user_stats
  update public.user_stats
  set tiket = coalesce(tiket, 0) + v_tickets,
      shake_last_at = now(),
      updated_at = now()
  where user_id = uid::text;

  -- Add to weekly tickets
  perform public.upsert_user_ticket(uid::text, v_draw_week, v_tickets);

  -- Add lottery tickets
  insert into public.lottery_tickets (user_id, draw_week)
  select uid::text, v_draw_week from generate_series(1, v_tickets);

  return jsonb_build_object('success', true, 'tickets_added', v_tickets);
end;
$$;

grant execute on function public.convert_cuan_to_ticket() to authenticated;
grant execute on function public.shake_to_win() to authenticated;
