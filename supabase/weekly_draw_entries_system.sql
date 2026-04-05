-- StrukCuan: Weekly Draw Entries System
-- Run this in Supabase SQL Editor

-- 1. weekly_draw_entries table
CREATE TABLE IF NOT EXISTS public.weekly_draw_entries (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draw_code      TEXT NOT NULL,
  ticket_threshold INTEGER NOT NULL, -- e.g. 10, 20, 30 ...
  week_key       TEXT NOT NULL,      -- e.g. '2026-W15'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS wde_user_week ON public.weekly_draw_entries (user_id, week_key);
CREATE INDEX IF NOT EXISTS wde_week ON public.weekly_draw_entries (week_key);
CREATE UNIQUE INDEX IF NOT EXISTS wde_user_threshold_week ON public.weekly_draw_entries (user_id, ticket_threshold, week_key);

ALTER TABLE public.weekly_draw_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own draw entries" ON public.weekly_draw_entries;
CREATE POLICY "Users read own draw entries"
  ON public.weekly_draw_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all draw entries" ON public.weekly_draw_entries;
CREATE POLICY "Admins read all draw entries"
  ON public.weekly_draw_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stats
      WHERE user_stats.user_id = auth.uid()
      AND user_stats.is_admin = true
    )
  );

-- 2. Function to get current week_key (ISO week format)
CREATE OR REPLACE FUNCTION public.get_current_week_key()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'IYYY-"W"IW');
$$;

-- 3. Function to generate a 6-digit draw code
CREATE OR REPLACE FUNCTION public.generate_draw_code()
RETURNS TEXT LANGUAGE SQL AS $$
  SELECT LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
$$;

-- 4. RPC: Ensure draw entries are generated for a user's current ticket count
--    Called from frontend after any ticket-granting event
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

    INSERT INTO public.weekly_draw_entries (user_id, draw_code, ticket_threshold, week_key)
    VALUES (p_user_id, v_draw_code, v_threshold, v_week_key)
    ON CONFLICT (user_id, ticket_threshold, week_key) DO NOTHING;

    v_new_entries := v_new_entries + 1;
    v_threshold := v_threshold + 10;
  END LOOP;

  RETURN jsonb_build_object('new_entries', v_new_entries, 'tiket', v_tiket, 'week_key', v_week_key);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_draw_entries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_week_key() TO authenticated;

-- 5. RPC: Get user's draw entries for current week
CREATE OR REPLACE FUNCTION public.get_my_draw_entries()
RETURNS TABLE (
  draw_code TEXT,
  ticket_threshold INTEGER,
  week_key TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT draw_code, ticket_threshold, week_key, created_at
  FROM public.weekly_draw_entries
  WHERE user_id = auth.uid()
    AND week_key = public.get_current_week_key()
  ORDER BY ticket_threshold ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_draw_entries() TO authenticated;

-- 6. weekly_draw_winners update (add week_key and draw_code if not present)
ALTER TABLE public.weekly_winners
  ADD COLUMN IF NOT EXISTS week_key TEXT,
  ADD COLUMN IF NOT EXISTS voucher_amount INTEGER DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS draw_code TEXT;
