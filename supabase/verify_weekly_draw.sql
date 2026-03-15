-- Weekly Draw Verification Report
-- Run in Supabase SQL Editor to verify if the weekly draw executed correctly

-- 1) weekly_winners: new rows in last 10 minutes
select
  '1. weekly_winners (last 10 min)' as check_name,
  count(*)::text as result,
  case when count(*) > 0 then 'PASS' else 'FAIL' end as status
from public.weekly_winners
where created_at >= now() - interval '10 minutes';

-- 2) lottery_tickets: should be cleared (empty or only new week)
-- Current week number for reference
do $$
declare
  v_cur_week integer := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  v_old_count bigint;
  v_new_count bigint;
  v_total bigint;
begin
  select count(*) into v_total from public.lottery_tickets;
  select count(*) into v_old_count from public.lottery_tickets where draw_week < v_cur_week;
  select count(*) into v_new_count from public.lottery_tickets where draw_week = v_cur_week;

  raise notice '2. lottery_tickets: total=%, old_weeks=%, current_week=%', v_total, v_old_count, v_new_count;
  if v_old_count > 0 then
    raise notice '   STATUS: FAIL - old tickets not cleared';
  else
    raise notice '   STATUS: PASS - no old tickets (cleared or never had)';
  end if;
end $$;

-- 2b) lottery_tickets summary (for report)
select
  '2. lottery_tickets' as check_name,
  'total=' || count(*)::text || ', current_week=' ||
  (select count(*)::text from public.lottery_tickets
   where draw_week = extract(week from (now() at time zone 'Asia/Jakarta'))::integer) as result,
  case when (select count(*) from public.lottery_tickets
             where draw_week < extract(week from (now() at time zone 'Asia/Jakarta'))::integer) > 0
       then 'FAIL (old tickets not cleared)' else 'PASS' end as status;

-- 3) user_tickets: reset for new week (no old week rows, or old week cleared)
select
  '3. user_tickets' as check_name,
  'max_draw_week=' || coalesce(max(draw_week)::text, 'null') || ', current_week=' ||
  extract(week from (now() at time zone 'Asia/Jakarta'))::text as result,
  case when exists (
    select 1 from public.user_tickets
    where draw_week < extract(week from (now() at time zone 'Asia/Jakarta'))::integer
  ) then 'CHECK (old weeks still present - may be intentional)' else 'PASS' end as status
from public.user_tickets;

-- 4) No duplicate winners in same draw (group by created_at date)
with draw_groups as (
  select
    (created_at at time zone 'Asia/Jakarta')::date as draw_date,
    user_id,
    count(*) as cnt
  from public.weekly_winners
  where created_at >= now() - interval '7 days'
  group by 1, 2
)
select
  '4. duplicate winners' as check_name,
  case when max(cnt) > 1 then 'FAIL: user_id ' || (select user_id from draw_groups where cnt > 1 limit 1) || ' appears ' || (select cnt::text from draw_groups where cnt > 1 limit 1) || 'x in same draw'
       else 'PASS (no duplicates)' end as result,
  case when coalesce(max(cnt), 0) > 1 then 'FAIL' else 'PASS' end as status
from draw_groups;

-- Summary: all checks in one view
select * from (
  select 1 as ord, '1. weekly_winners (last 10 min)' as check_name,
    count(*)::text as result,
    case when count(*) > 0 then 'PASS' else 'FAIL' end as status
  from public.weekly_winners where created_at >= now() - interval '10 minutes'
  union all
  select 2, '2. lottery_tickets cleared',
    'old_weeks=' || coalesce((select count(*)::text from public.lottery_tickets
      where draw_week < extract(week from (now() at time zone 'Asia/Jakarta'))::integer), '0'),
    case when (select count(*) from public.lottery_tickets
      where draw_week < extract(week from (now() at time zone 'Asia/Jakarta'))::integer) > 0
      then 'FAIL' else 'PASS' end
  union all
  select 3, '3. user_tickets (old weeks)',
    (select count(*)::text from public.user_tickets
     where draw_week < extract(week from (now() at time zone 'Asia/Jakarta'))::integer),
    case when (select count(*) from public.user_tickets
      where draw_week < extract(week from (now() at time zone 'Asia/Jakarta'))::integer) > 0
      then 'CHECK' else 'PASS' end
  union all
  select 4, '4. no duplicate winners',
    coalesce((select string_agg(user_id || ' x' || cnt::text, ', ')
      from (select user_id, count(*) as cnt from public.weekly_winners
            where created_at >= now() - interval '7 days'
            group by (created_at at time zone 'Asia/Jakarta')::date, user_id
            having count(*) > 1) x), 'none'),
    case when exists (select 1 from public.weekly_winners w
      where created_at >= now() - interval '7 days'
      group by (created_at at time zone 'Asia/Jakarta')::date, user_id
      having count(*) > 1) then 'FAIL' else 'PASS' end
) t order by ord;
