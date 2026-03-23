-- Update grant_ticket: 1 ad = 1 ticket, max 10 ads/day
-- Run in Supabase SQL Editor
--
-- New rules:
-- Every ad watched → +1 ticket immediately
-- Daily limit: 10 ads/day (was 18)
-- No more tier thresholds (5/10/18)

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
  v_today_start timestamptz;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  v_today_start := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Count today's ads (Asia/Jakarta)
  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and created_at >= v_today_start;

  -- Hard cap: 10 ads per day
  if v_count >= 10 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  -- Record the ad event
  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  -- Every ad = 1 ticket directly
  insert into public.user_stats (user_id, tiket)
  values (uid::text, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();

  -- Add to weekly lottery pool (cap at 40 tickets/week)
  if coalesce((select tickets from public.user_tickets where user_id = uid::text and draw_week = v_draw_week), 0) < 40 then
    perform public.upsert_user_ticket(uid::text, v_draw_week, 1);
    insert into public.lottery_tickets (user_id, draw_week) values (uid::text, v_draw_week);
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
