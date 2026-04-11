-- Smoke test: exercise run_weekly_draw without committing.
-- Run in Supabase SQL Editor after applying weekly_winners_display_name.sql (or lottery_system_audit_fix.sql).

begin;
select public.run_weekly_draw();
rollback;
