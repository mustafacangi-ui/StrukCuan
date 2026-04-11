-- =============================================================================
-- StrukCuan: disable duplicate weekly draw pg_cron job
-- =============================================================================
-- Keep only:
--   jobname = 'strukcuan-weekly-draw'
--   command = select public.run_weekly_draw()
--
-- Remove legacy duplicate:
--   jobname = 'weekly-draw'
--   command = select run_weekly_draw();   (no schema)
--
-- Run in Supabase SQL Editor (requires pg_cron extension).
-- =============================================================================

create extension if not exists pg_cron with schema extensions;

-- Remove legacy job by name (idempotent)
do $$
begin
  perform cron.unschedule('weekly-draw');
exception
  when others then
    null;
end $$;

-- If jobid 1 is confirmed to be the legacy weekly-draw row (inspect cron.job first):
do $$
begin
  if exists (
    select 1 from cron.job j
    where j.jobid = 1
      and (j.jobname = 'weekly-draw' or trim(j.command) ilike 'select run_weekly_draw();')
  ) then
    perform cron.unschedule(1);
  end if;
exception when others then
  null;
end $$;

-- Confirm remaining weekly-draw-related jobs (expect a single strukcuan-weekly-draw row)
select j.jobid, j.jobname, j.command, j.schedule, j.active
from cron.job j
where j.command ilike '%run_weekly_draw%'
order by j.jobid;
