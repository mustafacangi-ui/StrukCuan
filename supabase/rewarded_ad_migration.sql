-- Hybrid Rewarded Ad system - daily limit 5
-- Run in Supabase SQL Editor after monetag_ad_migration.sql

-- Add 'rewarded' to event_type for in-page hybrid ads (Monetag, Adsterra, PropellerAds)
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));
