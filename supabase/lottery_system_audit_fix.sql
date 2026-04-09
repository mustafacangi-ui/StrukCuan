-- StrukCuan: Weekly Reward & Lottery System Audit Fixes (STABILIZED)
-- This version removes illegal COMMIT statements and adds defensive UUID/TEXT casting.

-- ==========================================
-- 1. RECEIPT HASH PROTECTION
-- ==========================================
-- Add receipt_hash column to prevent duplicate uploads
ALTER TABLE public.receipts 
  ADD COLUMN IF NOT EXISTS receipt_hash TEXT;

-- Index for fast lookup (Safe to rerun)
CREATE INDEX IF NOT EXISTS receipts_hash_idx ON public.receipts (receipt_hash);

-- ==========================================
-- 2. HISTORY TABLES
-- ==========================================

-- weekly_draw_entries_history: records entries after the draw is completed
CREATE TABLE IF NOT EXISTS public.weekly_draw_entries_history (
  id             BIGINT, -- No Primary Key for safe idempotency
  user_id        UUID NOT NULL,
  draw_code      TEXT NOT NULL,
  ticket_threshold INTEGER NOT NULL,
  week_key       TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  archived_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS wdeh_user_week_idx ON public.weekly_draw_entries_history (user_id, week_key);

-- ==========================================
-- 3. DRAW CODE UNIQUENESS & COLLISION PROTECTION
-- ==========================================

-- Ensure no duplicate codes in the same week
-- Add unique constraint (Safe to rerun because of IF NOT EXISTS pattern in DROP/ADD)
ALTER TABLE public.weekly_draw_entries
  DROP CONSTRAINT IF EXISTS wde_draw_code_week_key_unique;
ALTER TABLE public.weekly_draw_entries
  ADD CONSTRAINT wde_draw_code_week_key_unique UNIQUE (draw_code, week_key);

-- Update generate_draw_code to ensure uniqueness within the week
DROP FUNCTION IF EXISTS public.generate_unique_draw_code(TEXT);
CREATE OR REPLACE FUNCTION public.generate_unique_draw_code(p_week_key TEXT)
RETURNS TEXT LANGUAGE PLPGSQL AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS (
      SELECT 1 FROM public.weekly_draw_entries 
      WHERE draw_code::text = v_code::text AND week_key::text = p_week_key::text
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- ==========================================
-- 4. STABILIZED ENSURE_DRAW_ENTRIES
-- ==========================================

DROP FUNCTION IF EXISTS public.ensure_draw_entries(UUID);
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
  -- Get current tiket count with defensive casting
  SELECT COALESCE(tiket, 0) INTO v_tiket
  FROM public.user_stats
  WHERE user_id::text = p_user_id::text;

  IF v_tiket IS NULL THEN
    RETURN jsonb_build_object('new_entries', 0);
  END IF;

  v_week_key := public.get_current_week_key();

  -- Max threshold earned: floor(tiket / 10) * 10
  v_max_threshold := FLOOR(v_tiket::NUMERIC / 10) * 10;

  IF v_max_threshold < 10 THEN
    RETURN jsonb_build_object('new_entries', 0);
  END IF;

  -- Find highest existing threshold for this week
  SELECT COALESCE(MAX(ticket_threshold), 0) INTO v_existing_max
  FROM public.weekly_draw_entries
  WHERE user_id::text = p_user_id::text AND week_key::text = v_week_key::text;

  -- Create missing entries
  v_threshold := v_existing_max + 10;
  WHILE v_threshold <= v_max_threshold LOOP
    v_draw_code := public.generate_unique_draw_code(v_week_key);

    INSERT INTO public.weekly_draw_entries (user_id, draw_code, ticket_threshold, week_key)
    VALUES (p_user_id, v_draw_code, v_threshold, v_week_key)
    ON CONFLICT (user_id, ticket_threshold, week_key) DO NOTHING;

    v_new_entries := v_new_entries + 1;
    v_threshold := v_threshold + 10;
  END LOOP;

  RETURN jsonb_build_object('new_entries', v_new_entries, 'tiket', v_tiket, 'week_key', v_week_key);
END;
$$;

-- ==========================================
-- 5. STABILIZED MASTER RESET & DRAW LOGIC
-- ==========================================

DROP FUNCTION IF EXISTS public.run_weekly_draw();
CREATE OR REPLACE FUNCTION public.run_weekly_draw()
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_draw_date    DATE    := (now() at time zone 'Asia/Jakarta')::date;
  v_week_key     TEXT    := public.get_current_week_key();
  v_draw_week    INTEGER := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  v_winner       RECORD;
  v_total        BIGINT;
  v_rnd          BIGINT;
  v_offset       BIGINT;
  v_picked       TEXT[]  := '{}';
  v_i            INTEGER;
  v_nickname     TEXT;
  v_display_id   INTEGER;
  v_display_name TEXT;
  v_winner_code  TEXT;
BEGIN
  -- 1) COUNT POOL (Based on lottery_tickets)
  v_total := (SELECT COUNT(*) FROM public.lottery_tickets);
  IF v_total = 0 THEN 
    -- Even if no winners, we proceed to reset logic (NO COMMIT ALLOWED HERE)
    NULL;
  END IF;

  -- 2) PICK 5 UNIQUE WINNERS
  FOR v_i IN 1..5 LOOP
    EXIT WHEN v_total <= 0;

    v_rnd    := FLOOR(RANDOM() * v_total)::BIGINT;
    v_offset := 0;

    FOR v_winner IN
      SELECT lt.id, lt.user_id FROM public.lottery_tickets lt ORDER BY lt.id
    LOOP
      -- Defensive Casting
      IF v_winner.user_id::text = ANY(v_picked) THEN
        CONTINUE;
      END IF;

      IF v_offset = v_rnd THEN
        -- Get User Identity with defensive casting
        SELECT COALESCE(nickname, 'User')
          INTO v_nickname
          FROM public.user_stats
         WHERE user_id::text = v_winner.user_id::text;

        v_display_id   := ABS(HASHTEXT(v_winner.user_id::text)) % 90000 + 10000;
        v_display_name := COALESCE(v_nickname, 'User') || ' #' || v_display_id::text;

        -- Find user's draw_code with defensive casting
        SELECT draw_code INTO v_winner_code
        FROM public.weekly_draw_entries
        WHERE user_id::text = v_winner.user_id::text AND week_key::text = v_week_key::text
        ORDER BY ticket_threshold DESC
        LIMIT 1;

        -- FALLBACK
        IF v_winner_code IS NULL THEN
          v_winner_code := v_winner.id::text;
        END IF;

        -- Record Winner
        INSERT INTO public.weekly_winners (
          user_id, winner_name, draw_date, prize_amount, voucher_amount, winning_ballot_id, draw_code, week_key, created_at
        )
        VALUES (
          v_winner.user_id::text, v_display_name, v_draw_date, 100000, 100000, v_winner.id, v_winner_code, v_week_key, NOW()
        );

        -- Notify Winner
        BEGIN
          INSERT INTO public.notifications (user_id, title, message)
          VALUES (
            v_winner.user_id::text,
            'Selamat! Kamu Menang Weekly Draw! 🎉',
            'Halo ' || COALESCE(v_nickname, 'User')
              || '! Kamu memenangkan voucher belanja Rp100.000 dari undian mingguan StrukCuan! '
              || 'Draw Code pemenang: #' || v_winner_code
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Notification failed for winner %: %', v_winner.user_id, SQLERRM;
        END;

        -- Remove winner's tickets from current pool
        v_picked := ARRAY_APPEND(v_picked, v_winner.user_id::text);
        DELETE FROM public.lottery_tickets WHERE user_id::text = v_winner.user_id::text;
        v_total := (SELECT COUNT(*) FROM public.lottery_tickets);
        EXIT;
      END IF;

      v_offset := v_offset + 1;
    END LOOP;

    IF COALESCE(ARRAY_LENGTH(v_picked, 1), 0) < v_i THEN
      EXIT;
    END IF;
  END LOOP;

  -- 3) MASTER RESET LOGIC (Safe within function transaction)

  -- A) ARCHIVE weekly_draw_entries
  INSERT INTO public.weekly_draw_entries_history (id, user_id, draw_code, ticket_threshold, week_key, created_at)
  SELECT id, user_id, draw_code, ticket_threshold, week_key, created_at
  FROM public.weekly_draw_entries
  WHERE week_key::text = v_week_key::text;

  DELETE FROM public.weekly_draw_entries WHERE week_key::text = v_week_key::text;

  -- B) RESET user_stats.tiket for all users
  UPDATE public.user_stats SET tiket = 0, updated_at = NOW();

  -- C) CLEAR lottery_tickets
  DELETE FROM public.lottery_tickets;

  -- D) CLEAR user_tickets
  DELETE FROM public.user_tickets WHERE draw_week = v_draw_week;

END;
$$;

-- ==========================================
-- 6. STABILIZED APPROVE_RECEIPT
-- ==========================================

DROP FUNCTION IF EXISTS public.approve_receipt(BIGINT, TEXT);
CREATE OR REPLACE FUNCTION public.approve_receipt(p_receipt_id BIGINT, p_receipt_hash TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_user_id TEXT;
  v_existing_id BIGINT;
BEGIN
  -- 1) Duplicate Check
  IF p_receipt_hash IS NOT NULL AND p_receipt_hash <> '' THEN
    SELECT id INTO v_existing_id 
    FROM public.receipts 
    WHERE receipt_hash::text = p_receipt_hash::text 
      AND status = 'approved'
      AND id <> p_receipt_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'DUPLICATE_RECEIPT' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 2) Lock receipt
  SELECT user_id INTO v_user_id
  FROM public.receipts
  WHERE id = p_receipt_id AND status = 'pending'
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found or not pending';
  END IF;

  -- 3) Update status and hash
  UPDATE public.receipts
  SET status = 'approved',
      receipt_hash = COALESCE(p_receipt_hash, receipt_hash)
  WHERE id = p_receipt_id;

  -- 4) Reward with defensive casting
  INSERT INTO public.user_stats (user_id, cuan, tiket)
  VALUES (v_user_id::text, 50, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    cuan = public.user_stats.cuan + 50,
    tiket = public.user_stats.tiket + 1;

  -- 5) Notification
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    v_user_id::text,
    'Receipt Approved',
    'Your receipt has been approved. You earned +50 cuan and +1 ticket.'
  );
END;
$$;
