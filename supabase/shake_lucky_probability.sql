-- Lucky Shake: probability distribution 50% / 25% / 13% / 7% / 5%
-- Run in Supabase SQL Editor.

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
  v_rand float;
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

  -- Lucky Shake probability: 50%→1, 25%→2, 13%→3, 7%→4, 5%→5
  v_rand := random();
  if v_rand < 0.50 then
    v_tickets := 1;
  elsif v_rand < 0.75 then
    v_tickets := 2;
  elsif v_rand < 0.88 then
    v_tickets := 3;
  elsif v_rand < 0.95 then
    v_tickets := 4;
  else
    v_tickets := 5;
  end if;

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select coalesce(tickets, 0) into v_current
  from public.user_tickets
  where user_id = uid::text and draw_week = v_draw_week;

  v_tickets := least(v_tickets, greatest(0, 42 - coalesce(v_current, 0)));

  if v_tickets <= 0 then
    raise exception 'WEEKLY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  update public.user_stats
  set tiket = coalesce(tiket, 0) + v_tickets,
      shake_last_at = now(),
      updated_at = now()
  where user_id = uid::text;

  perform public.upsert_user_ticket(uid::text, v_draw_week, v_tickets);

  insert into public.lottery_tickets (user_id, draw_week)
  select uid::text, v_draw_week from generate_series(1, v_tickets);

  return jsonb_build_object('success', true, 'tickets_added', v_tickets);
end;
$$;

grant execute on function public.shake_to_win() to authenticated;
