-- Fix: column "ticket" / "tiket" of relation "user_stats" does not exist
-- Run in Supabase SQL Editor
--
-- The grant_ticket RPC and migrations use "tiket" (Indonesian for ticket).
-- Some deployments may use "ticket". This migration ensures the correct column exists.
--
-- Handles:
-- 1) Table has "ticket" but not "tiket" -> rename ticket to tiket (preserves data)
-- 2) Table has "tiket" but not "ticket" -> add ticket, sync from tiket, add trigger
--    (keeps both in sync for RPCs that use "ticket")
-- 3) Table has neither -> add tiket
--
-- After this, run fix_ticket_creation_at_thresholds.sql for grant_ticket (5/10/18 ads).

do $$
begin
  -- Case 1: "ticket" exists but "tiket" does not -> rename (preserves data)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_stats' and column_name = 'ticket'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket'
  ) then
    alter table public.user_stats rename column ticket to tiket;
    raise notice 'Renamed user_stats.ticket to user_stats.tiket';
  end if;

  -- Case 2: "tiket" exists but "ticket" does not -> add ticket (RPC may use "ticket")
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_stats' and column_name = 'ticket'
  ) then
    alter table public.user_stats add column ticket integer not null default 0;
    update public.user_stats set ticket = tiket;
    -- Trigger: when ticket is updated, sync to tiket (frontend reads tiket)
    create or replace function public.sync_ticket_to_tiket()
    returns trigger language plpgsql as $$
    begin
      new.tiket := new.ticket;
      return new;
    end;
    $$;
    drop trigger if exists trg_sync_ticket_to_tiket on public.user_stats;
    create trigger trg_sync_ticket_to_tiket
      before insert or update of ticket on public.user_stats
      for each row execute function public.sync_ticket_to_tiket();
    raise notice 'Added user_stats.ticket column with sync trigger to tiket';
  end if;

  -- Case 3: Neither column exists -> add tiket
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket'
  ) then
    alter table public.user_stats add column tiket integer not null default 0;
    raise notice 'Added user_stats.tiket column';
  end if;
end
$$;
