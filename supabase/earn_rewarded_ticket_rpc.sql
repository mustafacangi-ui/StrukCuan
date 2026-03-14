-- RPC to earn a rewarded ticket - bypasses trigger, full control over logic
-- Run in Supabase SQL Editor. Fixes "Failed to grant ticket" by avoiding trigger failures.

-- 1) Modify trigger to skip 'rewarded' (RPC handles those)
create or replace function public.on_ad_ticket_earned()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.event_type = 'rewarded' then
    return new;
  end if;
  insert into public.user_stats (user_id, tiket)
  values (new.user_id::text, 1)
  on conflict (user_id)
  do update set tiket = public.user_stats.tiket + 1, updated_at = now();
  begin
    insert into public.notifications (user_id, title, message)
    values (new.user_id::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification insert failed: %', sqlerrm;
  end;
  return new;
end;
$$;

-- 2) Create the RPC (uses auth.uid(), enforces daily limit, updates user_stats)
create or replace function public.earn_rewarded_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_date_id text;
  v_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');

  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = v_user_id
    and event_type = 'rewarded'
    and week_id = v_date_id;

  if v_count >= 5 then
    raise exception 'Daily limit reached';
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id)
  values (v_user_id, 'rewarded', v_date_id);

  insert into public.user_stats (user_id, tiket)
  values (v_user_id::text, 1)
  on conflict (user_id)
  do update set
    tiket = public.user_stats.tiket + 1,
    updated_at = now();

  return jsonb_build_object('success', true, 'count', v_count + 1);
end;
$$;

-- 3) Grant execute to authenticated users
grant execute on function public.earn_rewarded_ticket() to authenticated;
