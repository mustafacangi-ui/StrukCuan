-- Grant +2 tickets for Red Label (deal) sharing
-- Run in Supabase SQL Editor

create or replace function public.grant_deal_tickets()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  v_draw_week integer;
  v_current_tickets integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Add 2 tickets (capped at 42 per week)
  perform public.upsert_user_ticket(uid, v_draw_week, 2);

  -- Also add to lottery_tickets for draw
  insert into public.lottery_tickets (user_id, draw_week)
  select uid, v_draw_week from generate_series(1, 2);

  return jsonb_build_object('success', true, 'tickets_added', 2);
end;
$$;

grant execute on function public.grant_deal_tickets() to authenticated;
