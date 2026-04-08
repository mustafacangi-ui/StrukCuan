-- Lucky Shake V2 (Defensive Casting Fixed): Stability Fix & Admin Controls
-- Resolves "operator does not exist: uuid = text" by using defensive ::text casts.

-- 1) IMPROVED shake_to_win with weighted distribution and proper weekly counting
CREATE OR REPLACE FUNCTION public.shake_to_win()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_draw_week integer;
  v_tickets integer;
  v_last date;
  v_today date;
  v_current_weekly integer;
  v_rand float;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  
  -- Check last shake date (Defensive casting: user_id::text = v_uid::text)
  SELECT (shake_last_at AT TIME ZONE 'Asia/Jakarta')::date INTO v_last
  FROM public.user_stats
  WHERE user_id::text = v_uid::text
  FOR UPDATE;

  IF v_last IS NOT NULL AND v_last = v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'SHAKE_ALREADY_USED');
  END IF;

  v_draw_week := extract(week from (now() AT TIME ZONE 'Asia/Jakarta'))::integer;

  -- Weighted Probability
  v_rand := random();
  IF v_rand < 0.50 THEN v_tickets := 1;
  ELSIF v_rand < 0.75 THEN v_tickets := 2;
  ELSIF v_rand < 0.90 THEN v_tickets := 3;
  ELSIF v_rand < 0.97 THEN v_tickets := 4;
  ELSE v_tickets := 5;
  END IF;

  -- Retrieve current weekly count (Defensive casting)
  SELECT coalesce(tickets, 0) INTO v_current_weekly
  FROM public.user_tickets
  WHERE user_id::text = v_uid::text AND draw_week = v_draw_week;

  -- Weekly Cap logic (Capped at 42 total for the week)
  IF v_current_weekly >= 42 THEN
    RETURN jsonb_build_object('success', false, 'error', 'WEEKLY_LIMIT_REACHED');
  END IF;

  v_tickets := least(v_tickets, greatest(0, 42 - v_current_weekly));

  -- Update user_stats (Defensive casting)
  UPDATE public.user_stats
  SET 
    tiket = coalesce(tiket, 0) + v_tickets,
    shake_last_at = now(),
    shake_last_reward = v_tickets,
    shake_total_tickets = coalesce(shake_total_tickets, 0) + v_tickets,
    shake_days_this_week = coalesce(shake_days_this_week, 0) + 1,
    updated_at = now()
  WHERE user_id::text = v_uid::text;

  -- Sync with weekly tickets system
  -- Note: upsert_user_ticket might need uuid or text; v_uid passed directly handles both if param is cast internally.
  PERFORM public.upsert_user_ticket(v_uid, v_draw_week, v_tickets);

  -- Generate actual lottery ticket entries (Defensive casting if inserting)
  -- If lottery_tickets.user_id is TEXT, we use v_uid::text
  INSERT INTO public.lottery_tickets (user_id, draw_week)
  SELECT v_uid::text, v_draw_week FROM generate_series(1, v_tickets);

  RETURN jsonb_build_object(
    'success', true, 
    'tickets_added', v_tickets, 
    'new_weekly_total', v_current_weekly + v_tickets
  );
END;
$$;

-- 2) ADMIN TOOL: Reset Lucky Shake (Defensive casting)
CREATE OR REPLACE FUNCTION public.admin_reset_lucky_shake(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_stats
  SET shake_last_at = NULL,
      updated_at = now()
  WHERE user_id::text = p_user_id::text;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'message', 'Lucky Shake reset successfully');
END;
$$;

-- 3) ADMIN TOOL: Reset Weekly Usage (Defensive casting)
CREATE OR REPLACE FUNCTION public.admin_clear_weekly_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draw_week integer;
BEGIN
  v_draw_week := extract(week from (now() AT TIME ZONE 'Asia/Jakarta'))::integer;

  UPDATE public.user_stats
  SET shake_days_this_week = 0,
      updated_at = now()
  WHERE user_id::text = p_user_id::text;

  DELETE FROM public.user_tickets
  WHERE user_id::text = p_user_id::text AND draw_week = v_draw_week;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'message', 'Weekly limits cleared for this week');
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.shake_to_win() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_lucky_shake(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_weekly_limit(uuid) TO authenticated;
