-- GLOBAL FIX: Defensive casting for UUID/Text interoperability
-- Run this in Supabase SQL Editor to resolve "operator does not exist: uuid = text" errors.
-- This script updates all RLS policies and critical RPCs to use the robust ::text = ::text pattern.

-- 1) USER_STATS RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own user_stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users select own stats" ON public.user_stats;
DROP POLICY IF EXISTS "User stats select" ON public.user_stats;
CREATE POLICY "Users can read own user_stats" ON public.user_stats 
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- 2) USER_TICKETS RLS
ALTER TABLE public.user_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User tickets select own" ON public.user_tickets;
DROP POLICY IF EXISTS "Users can read own user_tickets" ON public.user_tickets;
CREATE POLICY "Users can read own user_tickets" ON public.user_tickets 
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- 3) LOTTERY_TICKETS RLS
ALTER TABLE public.lottery_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own lottery ballots" ON public.lottery_tickets;
DROP POLICY IF EXISTS "Lottery tickets select" ON public.lottery_tickets;
CREATE POLICY "Users read own lottery ballots" ON public.lottery_tickets 
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- 4) AD_TICKET_EVENTS RLS
ALTER TABLE public.ad_ticket_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own ad_ticket_events" ON public.ad_ticket_events;
CREATE POLICY "Users can read own ad_ticket_events" ON public.ad_ticket_events 
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- 5) RECEIPTS RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own receipts" ON public.receipts;
CREATE POLICY "Users can read own receipts" ON public.receipts 
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- 6) NOTIFICATIONS RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications 
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

-- 7) RE-DEFINE upsert_user_ticket (Defensive Casting)
CREATE OR REPLACE FUNCTION public.upsert_user_ticket(p_user_id uuid, p_draw_week integer, p_add integer default 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- We use p_user_id (uuid) but handle the table column defensively
  INSERT INTO public.user_tickets (user_id, draw_week, tickets, updated_at)
  VALUES (p_user_id, p_draw_week, least(p_add, 40), now())
  ON CONFLICT (user_id, draw_week)
  DO UPDATE SET tickets = least(public.user_tickets.tickets + p_add, 40), updated_at = now();
END;
$$;

-- 8) RE-DEFINE grant_ticket (Defensive Casting)
CREATE OR REPLACE FUNCTION public.grant_ticket()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid;
  v_date_id text;
  v_count integer;
  v_draw_week integer;
  v_tickets_to_add integer := 0;
  v_today_start timestamptz;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  v_today_start := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Defensive check: user_id::text = uid::text
  SELECT count(*)::integer INTO v_count FROM public.ad_ticket_events
  WHERE user_id::text = uid::text AND event_type = 'rewarded' AND created_at >= v_today_start;

  IF v_count >= 15 THEN
    RAISE EXCEPTION 'DAILY_LIMIT_REACHED' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.ad_ticket_events (user_id, event_type, week_id)
  VALUES (uid, 'rewarded', v_date_id);

  v_count := v_count + 1;
  IF v_count = 5 OR v_count = 10 OR v_count = 15 THEN
    v_tickets_to_add := 1;
  END IF;

  IF v_tickets_to_add > 0 THEN
    -- Defensive on_conflict lookup (handled by database if primary key is uuid or text, but update logic is standard)
    INSERT INTO public.user_stats (user_id, tiket) VALUES (uid, v_tickets_to_add)
    ON CONFLICT (user_id) DO UPDATE SET tiket = public.user_stats.tiket + v_tickets_to_add, updated_at = now();

    -- Defensive check for weekly limit
    IF coalesce((SELECT tickets FROM public.user_tickets WHERE user_id::text = uid::text AND draw_week = v_draw_week), 0) < 40 THEN
      PERFORM public.upsert_user_ticket(uid, v_draw_week, v_tickets_to_add);
      INSERT INTO public.lottery_tickets (user_id, draw_week)
      SELECT uid, v_draw_week FROM generate_series(1, v_tickets_to_add);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9) RE-DEFINE get_my_lottery_ballots (Defensive)
CREATE OR REPLACE FUNCTION public.get_my_lottery_ballots()
RETURNS TABLE (id bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lt.id
  FROM public.lottery_tickets lt
  WHERE lt.user_id::text = auth.uid()::text
    AND lt.draw_week = extract(week from (now() at time zone 'Asia/Jakarta'))::integer
  ORDER BY lt.id ASC;
$$;

-- 10) RE-DEFINE get_today_rewarded_count (Defensive)
CREATE OR REPLACE FUNCTION public.get_today_rewarded_count()
RETURNS integer 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
STABLE AS $$
  SELECT count(*)::integer FROM public.ad_ticket_events
  WHERE user_id::text = auth.uid()::text
    AND event_type = 'rewarded'
    AND created_at >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta');
$$;

GRANT EXECUTE ON FUNCTION public.grant_ticket() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_lottery_ballots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_rewarded_count() TO authenticated;

-- 11) RE-DEFINE on_ad_ticket_earned (Defensive)
CREATE OR REPLACE FUNCTION public.on_ad_ticket_earned()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF new.event_type = 'rewarded' THEN
    RETURN new;  -- grant_ticket RPC handles these
  END IF;
  BEGIN
    -- user_id::text handled by database for conflicts usually, but insert logic is clean
    INSERT INTO public.user_stats (user_id, tiket)
    VALUES (new.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET tiket = public.user_stats.tiket + 1, updated_at = now();
  EXCEPTION WHEN others THEN
    RAISE WARNING 'user_stats insert failed (ticket still granted): %', sqlerrm;
  END;
  RETURN new;
END;
$$;
