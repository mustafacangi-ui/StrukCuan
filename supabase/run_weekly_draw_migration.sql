-- =============================================================================
-- StrukCuan Weekly Draw System - Final Migration
-- =============================================================================
-- Run in Supabase SQL Editor
--
-- SCHEDULE: Sunday 21:00 Jakarta time (WIB) = 14:00 UTC
-- CRON: 0 14 * * 0  (minute 0, hour 14 UTC, every Sunday)
--
-- PRIZE: 500,000 Rp total → 5 winners × 100,000 Rp shopping voucher each
--
-- RULES:
-- - Each row in lottery_tickets = 1 ticket
-- - draw_date = current date (e.g. 2026-03-15), NOT week numbers
-- - One win per user per draw (user with 40 tickets still wins only once)
-- - After draw: lottery_tickets cleared, user_tickets.tickets reset to 0

-- =============================================================================
-- 1) Alter weekly_winners: add draw_date and prize_amount
-- =============================================================================
alter table public.weekly_winners
  add column if not exists draw_date date,
  add column if not exists prize_amount numeric default 100000;

create index if not exists weekly_winners_draw_date_idx on public.weekly_winners (draw_date desc);

-- =============================================================================
-- 2) run_weekly_draw() - Main draw function
-- =============================================================================
create or replace function public.run_weekly_draw()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draw_date date := (now() at time zone 'Asia/Jakarta')::date;
  v_draw_week integer := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  v_winner record;
  v_total bigint;
  v_rnd bigint;
  v_offset bigint;
  v_picked text[] := '{}';
  v_i integer;
begin
  -- Step 1: Read ticket pool (lottery_tickets)
  v_total := (select count(*) from public.lottery_tickets);
  if v_total = 0 then
    return;
  end if;

  -- Step 2 & 3: Randomly select 5 UNIQUE users (weighted by ticket count)
  -- Each ticket = equal chance. User with 40 tickets has 40x the chance of user with 1.
  for v_i in 1..5 loop
    exit when v_total <= 0;

    -- Pick random ticket (0-based offset) from pool of tickets from users not yet picked
    v_rnd := floor(random() * v_total)::bigint;
    v_offset := 0;

    for v_winner in
      select user_id from public.lottery_tickets order by id
    loop
      if v_winner.user_id = any(v_picked) then
        continue;  -- Skip tickets from already-picked users
      end if;
      if v_offset = v_rnd then
        -- Step 3: Insert winner into weekly_winners
        insert into public.weekly_winners (user_id, draw_date, prize_amount, created_at)
        values (v_winner.user_id, v_draw_date, 100000, now());

        -- Notify winner
        insert into public.notifications (user_id, title, message)
        values (
          v_winner.user_id,
          'Selamat! Kamu Menang!',
          'Kamu memenangkan voucher belanja 100.000 Rp dari undian mingguan StrukCuan!'
        );

        v_picked := array_append(v_picked, v_winner.user_id);

        -- Remove this user's tickets from pool (Step 6: prevent duplicate in same draw)
        delete from public.lottery_tickets where user_id = v_winner.user_id;
        v_total := (select count(*) from public.lottery_tickets);
        exit;  -- Found winner, go to next of 5
      end if;
      v_offset := v_offset + 1;
    end loop;
    -- If no winner found (all remaining tickets from already-picked users), exit
    if coalesce(array_length(v_picked, 1), 0) < v_i then
      exit;
    end if;
  end loop;

  -- Step 4: Delete all remaining rows from lottery_tickets
  delete from public.lottery_tickets;

  -- Step 5: Reset weekly ticket counters for the drawn week
  update public.user_tickets set tickets = 0, updated_at = now() where draw_week = v_draw_week;
end;
$$;

grant execute on function public.run_weekly_draw() to service_role;

-- =============================================================================
-- 3) pg_cron: Schedule run_weekly_draw every Sunday 21:00 Jakarta (14:00 UTC)
-- =============================================================================
-- Enable pg_cron (enable in Supabase Dashboard: Database → Extensions → pg_cron)
create extension if not exists pg_cron with schema extensions;

-- Remove existing jobs if present (idempotent)
do $$
begin
  perform cron.unschedule('strukcuan-weekly-draw');
exception when others then
  null;
end $$;

-- Drop legacy duplicate (same draw, wrong command / duplicate schedule)
do $$
begin
  perform cron.unschedule('weekly-draw');
exception when others then
  null;
end $$;

-- Schedule: 0 14 * * 0 = minute 0, hour 14 UTC, Sunday (= 21:00 Jakarta)
select cron.schedule(
  'strukcuan-weekly-draw',
  '0 14 * * 0',
  $$select public.run_weekly_draw()$$
);

-- =============================================================================
-- SQL EXPLANATION
-- =============================================================================
--
-- 1) weekly_winners ALTER
--    Adds draw_date (date) and prize_amount (numeric) for the new draw format.
--    draw_date = actual date (e.g. 2026-03-15), not week number.
--
-- 2) run_weekly_draw() - Step by step
--
--    Step 1: Count lottery_tickets. Each row = 1 ticket. Exit if empty.
--
--    Step 2 & 3: Loop 5 times to pick 5 UNIQUE winners:
--      - v_total = tickets from users not yet picked
--      - v_rnd = random offset 0..(v_total-1)
--      - Iterate tickets in id order; count only tickets from non-picked users
--      - When count reaches v_rnd, that user wins
--      - Insert into weekly_winners (user_id, draw_date, prize_amount=100000)
--      - Send notification to winner
--      - Delete winner's tickets from pool (prevents same user winning twice)
--      - Recompute v_total for next iteration
--
--    Step 4: DELETE FROM lottery_tickets — clear entire table after draw
--
--    Step 5: UPDATE user_tickets SET tickets = 0 WHERE draw_week = current week
--            Resets ticket counters for the drawn week
--
-- 3) pg_cron
--    cron.schedule('name', '0 14 * * 0', 'SQL')
--    Runs every Sunday at 14:00 UTC = 21:00 Jakarta (WIB).
--    Enable pg_cron in Supabase Dashboard → Database → Extensions first.
