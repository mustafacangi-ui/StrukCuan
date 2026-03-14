-- Fix on_ad_ticket_earned trigger: notification failure must not rollback ticket grant
-- Run in Supabase SQL Editor if "Failed to grant ticket" occurs
--
-- For 'rewarded' events: return early (grant_ticket RPC handles user_stats).
-- For other events: update user_stats, attempt notification (wrapped in EXCEPTION).
-- All ID comparisons use explicit casts to avoid "operator does not exist: uuid = text".

create or replace function public.on_ad_ticket_earned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- grant_ticket RPC handles user_stats for 'rewarded' events; skip trigger logic
  if new.event_type = 'rewarded' then
    return new;
  end if;

  -- user_stats: user_id is text; new.user_id is uuid → cast to text
  begin
    insert into public.user_stats (user_id, tiket)
    values ((new.user_id)::text, 1)
    on conflict (user_id)
    do update set
      tiket = public.user_stats.tiket + 1,
      updated_at = now();
  exception when others then
    raise warning 'user_stats insert failed (ticket still granted): %', sqlerrm;
  end;

  -- notifications: wrap in block so failure here never rolls back the ticket
  begin
    insert into public.notifications (user_id, title, message)
    values ((new.user_id)::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification insert failed (ticket still granted): %', sqlerrm;
  end;

  return new;
end;
$$;
