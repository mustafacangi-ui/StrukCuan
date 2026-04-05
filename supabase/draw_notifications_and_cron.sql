-- StrukCuan: Weekly Draw System with Notifications and Weekend Cron
-- Run this in Supabase SQL Editor

-- 1. Modify ensure_draw_entries to insert notifications immediately
CREATE OR REPLACE FUNCTION public.ensure_draw_entries(p_user_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_tiket INTEGER;
  v_week_key TEXT;
  v_threshold INTEGER;
  v_max_threshold INTEGER;
  v_existing_max INTEGER;
  v_new_entries INTEGER := 0;
  v_draw_code TEXT;
BEGIN
  -- Get current tiket count
  SELECT COALESCE(tiket, 0) INTO v_tiket
  FROM public.user_stats
  WHERE user_id = p_user_id;

  IF v_tiket IS NULL THEN
    RETURN jsonb_build_object('new_entries', 0);
  END IF;

  v_week_key := public.get_current_week_key();

  -- Max threshold they've earned: floor(tiket / 10) * 10
  v_max_threshold := FLOOR(v_tiket::NUMERIC / 10) * 10;

  IF v_max_threshold < 10 THEN
    RETURN jsonb_build_object('new_entries', 0);
  END IF;

  -- Find highest existing threshold for this week
  SELECT COALESCE(MAX(ticket_threshold), 0) INTO v_existing_max
  FROM public.weekly_draw_entries
  WHERE user_id = p_user_id AND week_key = v_week_key;

  -- Create missing entries
  v_threshold := v_existing_max + 10;
  WHILE v_threshold <= v_max_threshold LOOP
    v_draw_code := public.generate_draw_code();

    BEGIN
      INSERT INTO public.weekly_draw_entries (
        user_id, draw_code, ticket_threshold, week_key, notification_sent, email_sent
      )
      VALUES (
        p_user_id, v_draw_code, v_threshold, v_week_key, TRUE, FALSE
      );
      
      -- If successful, create in-app notification
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        p_user_id,
        'Weekly Draw Entry Earned! 🎫',
        'Congratulations! You earned a new weekly draw entry. Your Draw ID is #' || v_draw_code
      );
      
      v_new_entries := v_new_entries + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Do nothing, entry exists
    END;

    v_threshold := v_threshold + 10;
  END LOOP;

  RETURN jsonb_build_object('new_entries', v_new_entries, 'tiket', v_tiket, 'week_key', v_week_key);
END;
$$;


-- 2. Server-side Weekend Draw Function (Run via pg_cron or External Trigger every Sunday night)
CREATE OR REPLACE FUNCTION public.run_sunday_draw(p_week_key TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_target_week TEXT;
  v_winner_count INTEGER;
  v_winners_placed INTEGER := 0;
  rec RECORD;
BEGIN
  -- If week is not explicitly requested, pick current week
  IF p_week_key IS NULL THEN
     v_target_week := public.get_current_week_key();
  ELSE
     v_target_week := p_week_key;
  END IF;

  -- Verify how many winners exist for this week already
  SELECT COUNT(*) INTO v_winner_count 
  FROM public.weekly_winners 
  WHERE week_key = v_target_week;

  -- We need exactly 5 winners per week.
  IF v_winner_count >= 5 THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'Already have 5 winners for ' || v_target_week);
  END IF;

  -- Loop through up to 5 missing winners, picking random DISTINCT users who haven't won this week yet
  FOR rec IN (
    SELECT wde.user_id, wde.draw_code
    FROM public.weekly_draw_entries wde
    WHERE wde.week_key = v_target_week
      AND NOT EXISTS (
        SELECT 1 FROM public.weekly_winners ww 
        WHERE ww.week_key = v_target_week AND ww.user_id = wde.user_id
      )
    ORDER BY RANDOM()
    LIMIT (5 - v_winner_count)
  ) LOOP
    -- Insert into winners table
    INSERT INTO public.weekly_winners (
      user_id, draw_date, status, payment_status, week_key, draw_code, voucher_amount
    ) VALUES (
      rec.user_id, NOW(), 'pending', 'unpaid', v_target_week, rec.draw_code, 50000
    );

    -- Send winner notification
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      rec.user_id,
      'Congratulations! You won the Weekly Draw 🎉',
      'Your draw code #' || rec.draw_code || ' won this week''s Rp50,000 Indomaret voucher. We will contact you soon.'
    );

    v_winners_placed := v_winners_placed + 1;
  END LOOP;

  RETURN jsonb_build_object('status', 'success', 'week_key', v_target_week, 'winners_chosen', v_winners_placed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_sunday_draw(TEXT) TO authenticated;
