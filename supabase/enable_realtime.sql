-- =============================================================================
-- Enable Supabase Realtime for Rewards Tables
-- =============================================================================

-- 1) Ensure the publication exists
-- Note: 'supabase_realtime' is the default name in Supabase.
-- It might already exist, but we need to make sure our tables are in it.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- 2) Add tables to the publication
-- This allows Supabase to broadcast changes to these tables.
alter publication supabase_realtime add table public.user_tickets;
alter publication supabase_realtime add table public.user_stats;
alter publication supabase_realtime add table public.survey_events;
alter publication supabase_realtime add table public.survey_rewards;

-- 3) Verify publication contents (for checking in SQL editor)
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
