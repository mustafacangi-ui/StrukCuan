-- Monetag Direct Ad integration - daily limit 5
-- Run in Supabase SQL Editor

-- Add 'monetag' to event_type (drop and recreate check)
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag'));
