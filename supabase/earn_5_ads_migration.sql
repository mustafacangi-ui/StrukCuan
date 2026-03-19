-- Earn: 5 videos/day limit, 5 videos = 1 ticket
-- Run in Supabase SQL Editor.

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

  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and created_at >= v_today_start;

  if v_count >= 5 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  v_count := v_count + 1;
  if v_count = 5 then
    v_tickets_to_add := 1;
  end if;

  if v_tickets_to_add > 0 then
    insert into public.user_stats (user_id, tiket)
    values (uid::text, v_tickets_to_add)
    on conflict (user_id)
    do update set tiket = public.user_stats.tiket + v_tickets_to_add, updated_at = now();

    if coalesce((select tickets from public.user_tickets where user_id = uid::text and draw_week = v_draw_week), 0) < 42 then
      perform public.upsert_user_ticket(uid::text, v_draw_week, v_tickets_to_add);
      insert into public.lottery_tickets (user_id, draw_week)
      select uid::text, v_draw_week from generate_series(1, v_tickets_to_add);
    end if;
  end if;

  return jsonb_build_object('success', true);
end;
$$;
