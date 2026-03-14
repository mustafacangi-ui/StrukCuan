-- Fix grant_ticket: ensure ad_ticket_events accepts 'rewarded' and RPC inserts correctly
-- Run this in Supabase SQL Editor if ad_ticket_events stays empty after watching ads

-- 0) Trigger must skip 'rewarded' (grant_ticket RPC handles user_stats for those)
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

-- 1) Allow 'rewarded' event_type (required for grant_ticket inserts)
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));

-- 2) Ensure ticket_number column exists
alter table public.ad_ticket_events add column if not exists ticket_number text;

-- 3) grant_ticket RPC: inserts 1 row per ad into ad_ticket_events
create or replace function public.grant_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_date_id text;
  v_ads_count integer;
  v_ticket_number text;
  v_grants_ticket boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');

  select count(*)::integer into v_ads_count
  from public.ad_ticket_events
  where user_id = v_user_id
    and event_type = 'rewarded'
    and week_id = v_date_id;

  if v_ads_count >= 10 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  v_ads_count := v_ads_count + 1;
  v_grants_ticket := (v_ads_count = 5 or v_ads_count = 10);

  if v_grants_ticket then
    v_ticket_number := 'STRUK-' || floor(random() * 900000 + 100000)::text;
    while exists (select 1 from public.ad_ticket_events where ticket_number = v_ticket_number) loop
      v_ticket_number := 'STRUK-' || floor(random() * 900000 + 100000)::text;
    end loop;
  else
    v_ticket_number := null;
  end if;

  -- Insert row into ad_ticket_events (this is the critical insert)
  insert into public.ad_ticket_events (user_id, event_type, week_id, ticket_number)
  values (v_user_id, 'rewarded', v_date_id, v_ticket_number);

  if v_grants_ticket then
    insert into public.user_stats (user_id, tiket)
    values (v_user_id::text, 1)
    on conflict (user_id)
    do update set tiket = public.user_stats.tiket + 1, updated_at = now();

    begin
      insert into public.notifications (user_id, title, message)
      values (v_user_id::text, 'Ticket Earned!', 'You earned +1 ticket from watching ads.');
    exception when others then
      raise warning 'Notification insert failed: %', sqlerrm;
    end;
  end if;

  return jsonb_build_object(
    'success', true,
    'ads_watched', v_ads_count,
    'ticket_number', v_ticket_number,
    'grants_ticket', v_grants_ticket
  );
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
