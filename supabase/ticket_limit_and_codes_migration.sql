-- Daily limit enforcement + ticket codes for lottery verification
-- Run in Supabase SQL Editor

-- 1) Add ticket_number column to ad_ticket_events
alter table public.ad_ticket_events
  add column if not exists ticket_number text;

create unique index if not exists ad_ticket_events_ticket_number_idx
  on public.ad_ticket_events (ticket_number)
  where ticket_number is not null;

-- 2) Create grant_ticket RPC: daily limit 5, generate ticket_number, return DAILY_LIMIT_REACHED
create or replace function public.grant_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_date_id text;
  v_count integer;
  v_ticket_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');

  -- Count rewarded tickets today
  select count(*)::integer into v_count
  from public.ad_ticket_events
  where user_id = v_user_id
    and event_type = 'rewarded'
    and week_id = v_date_id;

  if v_count >= 5 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  -- Generate unique ticket code: STRUK-XXXXXX (6 random digits, 100000-999999)
  v_ticket_number := 'STRUK-' || floor(random() * 900000 + 100000)::text;

  -- Ensure uniqueness (retry if collision - extremely rare)
  while exists (select 1 from public.ad_ticket_events where ticket_number = v_ticket_number) loop
    v_ticket_number := 'STRUK-' || floor(random() * 900000 + 100000)::text;
  end loop;

  insert into public.ad_ticket_events (user_id, event_type, week_id, ticket_number)
  values (v_user_id, 'rewarded', v_date_id, v_ticket_number);

  insert into public.user_stats (user_id, tiket)
  values (v_user_id::text, 1)
  on conflict (user_id)
  do update set
    tiket = public.user_stats.tiket + 1,
    updated_at = now();

  begin
    insert into public.notifications (user_id, title, message)
    values (v_user_id::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification insert failed: %', sqlerrm;
  end;

  return jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'count', v_count + 1);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
