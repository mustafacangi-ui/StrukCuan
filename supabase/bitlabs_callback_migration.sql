-- Add bitlabs to survey_events provider check
-- Run this if survey_events already exists with old constraint
alter table public.survey_events drop constraint if exists survey_events_provider_check;
alter table public.survey_events add constraint survey_events_provider_check
  check (provider in ('cpx', 'pollfish', 'bitlabs', 'other'));
