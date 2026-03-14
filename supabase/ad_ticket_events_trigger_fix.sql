-- Fix on_ad_ticket_earned trigger: resilient to notification failures, explicit type cast
-- Run in Supabase SQL Editor if "Failed to grant ticket" occurs

create or replace function public.on_ad_ticket_earned()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update user_stats (user_id is text; cast uuid for consistency)
  insert into public.user_stats (user_id, tiket)
  values (new.user_id::text, 1)
  on conflict (user_id)
  do update set
    tiket = public.user_stats.tiket + 1,
    updated_at = now();

  -- Notifications: wrap in block so failure here doesn't roll back the ticket
  begin
    insert into public.notifications (user_id, title, message)
    values (new.user_id::text, 'Ticket Earned!', 'You earned +1 ticket from watching an ad.');
  exception when others then
    raise warning 'Notification insert failed (ticket still granted): %', sqlerrm;
  end;

  return new;
end;
$$;
