-- Admin Panel Real-time User Stats Setup (FIXED)
-- 1. Ensure tracking column exists
alter table public.user_stats
  add column if not exists last_seen_at timestamptz default now();

alter table public.survey_profiles
  add column if not exists last_seen_at timestamptz default now();

-- 2. Create RPC for heartbeat (updates last_seen_at)
create or replace function public.update_last_seen()
returns void
language plpgsql
security definer
as $$
declare
  current_uid uuid;
begin
  current_uid := auth.uid();

  update public.survey_profiles
  set last_seen_at = now()
  where user_id = current_uid::text;

  update public.user_stats
  set updated_at = now()
  where user_id = current_uid::text;
end;
$$;

-- 3. Create or replace the aggregated stats function
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_total bigint;
  v_online bigint;
  v_active_today bigint;
  v_active_week bigint;
  v_new_today bigint;
  v_new_week bigint;
  v_chart_new jsonb;
  v_chart_active jsonb;
begin
  /* 
     We join with survey_profiles or use user_stats.updated_at 
     because user_stats might be missing created_at in some environments.
  */

  -- Total
  select count(*) into v_total from public.user_stats;
  
  -- Online (last 5 minutes)
  -- Count from survey_profiles as requested by user
  select count(*) 
  into v_online 
  from public.survey_profiles 
  where last_seen_at > now() - interval '5 minutes';
  
  -- Active today (24h)
  select count(*) 
  into v_active_today 
  from public.survey_profiles 
  where last_seen_at > now() - interval '24 hours';
  
  -- Active week (7d)
  select count(*) 
  into v_active_week 
  from public.survey_profiles 
  where last_seen_at > now() - interval '7 days';
  
  -- New today (24h)
  -- Logic: Check survey_profiles.created_at, fallback to user_stats.updated_at
  select count(*) 
  into v_new_today 
  from public.user_stats s
  left join public.survey_profiles p on s.user_id = p.user_id
  where coalesce(p.created_at, s.updated_at) > now() - interval '24 hours';
  
  -- New week (7d)
  select count(*) 
  into v_new_week 
  from public.user_stats s
  left join public.survey_profiles p on s.user_id = p.user_id
  where coalesce(p.created_at, s.updated_at) > now() - interval '7 days';

  -- Chart Data: New Users (last 7 days)
  select jsonb_agg(d) into v_chart_new from (
    select to_char(date_trunc('day', coalesce(p.created_at, s.updated_at)), 'YYYY-MM-DD') as date, count(*) as count
    from public.user_stats s
    left join public.survey_profiles p on s.user_id = p.user_id
    where coalesce(p.created_at, s.updated_at) > now() - interval '7 days'
    group by 1 order by 1
  ) d;

  -- Chart Data: Active Users (last 7 days grouped by last_seen_at from survey_profiles)
  select jsonb_agg(d) into v_chart_active from (
    select to_char(date_trunc('day', last_seen_at), 'YYYY-MM-DD') as date, count(*) as count
    from public.survey_profiles
    where last_seen_at > now() - interval '7 days'
    group by 1 order by 1
  ) d;

  return jsonb_build_object(
    'totalUsers', v_total,
    'onlineNow', v_online,
    'activeToday', v_active_today,
    'activeThisWeek', v_active_week,
    'newToday', v_new_today,
    'newThisWeek', v_new_week,
    'chartNew', coalesce(v_chart_new, '[]'::jsonb),
    'chartActive', coalesce(v_chart_active, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.update_last_seen() to authenticated;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
