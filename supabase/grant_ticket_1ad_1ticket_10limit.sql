-- grant_ticket: 1 ad = 1 ticket, max 10 ads/day
-- Column types AFTER fix_uuid_text_final.sql migration:
--   ad_ticket_events.user_id  = UUID  → use uid           (no cast)
--   user_stats.user_id        = UUID  → use uid           (no cast)  ← was TEXT, now UUID
--   notifications.user_id     = UUID  → use uid           (no cast)  ← was TEXT, now UUID
--   user_tickets.user_id      = TEXT  → use uid::text
--   lottery_tickets.user_id   = TEXT  → use uid::text
-- Run in Supabase SQL Editor.

create or replace function public.grant_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid;
  v_date_id    text;
  v_draw_week  integer;
  v_count      integer;
  v_today_start timestamptz;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  v_today_start := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  v_date_id    := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week  := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Count today's rewarded ads (ad_ticket_events.user_id = UUID)
  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = uid
    and event_type = 'rewarded'
    and created_at >= v_today_start;

  -- Hard cap: 10 ads/day
  if v_count >= 10 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  -- Record the ad event (ad_ticket_events.user_id = UUID → uid directly)
  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (uid, 'rewarded', v_date_id);

  -- +1 ticket to user_stats (user_stats.user_id = UUID after fix_uuid_text_final → uid directly)
  insert into public.user_stats (user_id, tiket)
  values (uid, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();

  -- Add to weekly lottery pool capped at 40/week
  -- user_tickets.user_id = TEXT → uid::text
  if coalesce(
    (select tickets from public.user_tickets
     where user_id = uid::text and draw_week = v_draw_week), 0
  ) < 40 then
    perform public.upsert_user_ticket(uid::text, v_draw_week, 1);
    -- lottery_tickets.user_id = TEXT → uid::text
    insert into public.lottery_tickets (user_id, draw_week)
    values (uid::text, v_draw_week);
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
