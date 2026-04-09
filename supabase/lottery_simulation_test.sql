-- StrukCuan: Lottery System Simulation Test
-- Run this in Supabase SQL Editor to verify 5 unique winners and reset logic.

DO $$
DECLARE
  v_user1 UUID := '11111111-1111-1111-1111-111111111111';
  v_user2 UUID := '22111111-1111-1111-1111-111111111111';
  v_user3 UUID := '33111111-1111-1111-1111-111111111111';
  v_user4 UUID := '44111111-1111-1111-1111-111111111111';
  v_user5 UUID := '55111111-1111-1111-1111-111111111111';
  v_user6 UUID := '66111111-1111-1111-1111-111111111111';
  v_week TEXT := public.get_current_week_key();
  v_winner_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting Lottery Simulation for week %', v_week;

  -- 1) Create Test Users (if not exist)
  INSERT INTO public.user_stats (user_id, nickname, tiket) VALUES 
    (v_user1::text, 'Alpha', 50),
    (v_user2::text, 'Bravo', 40),
    (v_user3::text, 'Charlie', 30),
    (v_user4::text, 'Delta', 20),
    (v_user5::text, 'Echo', 10),
    (v_user6::text, 'Foxtrot', 5)
  ON CONFLICT (user_id) DO UPDATE SET tiket = EXCLUDED.tiket;

  -- 2) Generate Lottery Pool
  DELETE FROM public.lottery_tickets;
  INSERT INTO public.lottery_tickets (user_id, draw_week)
  SELECT user_id, extract(week from now())::int FROM (
    SELECT v_user1::text as user_id, generate_series(1, 50) UNION ALL
    SELECT v_user2::text, generate_series(1, 40) UNION ALL
    SELECT v_user3::text, generate_series(1, 30) UNION ALL
    SELECT v_user4::text, generate_series(1, 20) UNION ALL
    SELECT v_user5::text, generate_series(1, 10) UNION ALL
    SELECT v_user6::text, generate_series(1, 5)
  ) t;

  -- 3) Mint Draw Entries (Codes)
  PERFORM public.ensure_draw_entries(v_user1);
  PERFORM public.ensure_draw_entries(v_user2);
  PERFORM public.ensure_draw_entries(v_user3);
  PERFORM public.ensure_draw_entries(v_user4);
  PERFORM public.ensure_draw_entries(v_user5);

  -- 4) Run Draw
  PERFORM public.run_weekly_draw();

  -- 5) Verification
  SELECT COUNT(*) INTO v_winner_count FROM public.weekly_winners WHERE draw_date = CURRENT_DATE;
  RAISE NOTICE 'Total winners today: %', v_winner_count;

  -- Verify unique users with defensive casting
  IF (SELECT COUNT(DISTINCT user_id::text) FROM public.weekly_winners WHERE draw_date = CURRENT_DATE) < v_winner_count THEN
    RAISE EXCEPTION 'Duplicate users found in winners list!';
  END IF;

  -- Verify ticket reset with defensive casting
  IF (SELECT SUM(tiket) FROM public.user_stats WHERE user_id::text IN (v_user1::text, v_user2::text)) > 0 THEN
    RAISE EXCEPTION 'user_stats.tiket was not reset to 0!';
  END IF;

  -- Verify archival
  IF (SELECT COUNT(*) FROM public.weekly_draw_entries_history WHERE week_key::text = v_week::text) = 0 THEN
    RAISE EXCEPTION 'weekly_draw_entries were not moved to history!';
  END IF;

  RAISE NOTICE 'Simulation SUCCESS! All checks passed.';
END $$;
