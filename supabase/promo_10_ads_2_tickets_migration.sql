-- Promo reward logic: 5 ads = 1 ticket, 10 ads = daily limit (2 tickets)
-- Daily limit based on ADS WATCHED, not tickets.
-- Run in Supabase SQL Editor

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

  -- Count ads watched today (each row = 1 ad)
  select count(*)::integer into v_ads_count
  from public.ad_ticket_events
  where user_id = v_user_id
    and event_type = 'rewarded'
    and week_id = v_date_id;

  -- Daily limit: 10 ads
  if v_ads_count >= 10 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  v_ads_count := v_ads_count + 1;
  -- Grant ticket (ticket_number, user_stats) only on 5th and 10th ad
  v_grants_ticket := (v_ads_count = 5 or v_ads_count = 10);

  if v_grants_ticket then
    v_ticket_number := 'STRUK-' || floor(random() * 900000 + 100000)::text;
    while exists (select 1 from public.ad_ticket_events where ticket_number = v_ticket_number) loop
      v_ticket_number := 'STRUK-' || floor(random() * 900000 + 100000)::text;
    end loop;
  else
    v_ticket_number := null;
  end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id, ticket_number)
  values (v_user_id, 'rewarded', v_date_id, v_ticket_number);

  if v_grants_ticket then
    insert into public.user_stats (user_id, tiket)
    values (v_user_id::text, 1)
    on conflict (user_id)
    do update set
      tiket = public.user_stats.tiket + 1,
      updated_at = now();

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
