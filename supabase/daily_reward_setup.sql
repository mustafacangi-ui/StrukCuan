-- 1. DAILY_LOGIN_REWARDS (Tracks one claim per calendar day)
CREATE TABLE IF NOT EXISTS public.daily_login_rewards (
    user_id uuid NOT NULL,
    claim_date date NOT NULL,
    timezone_used text DEFAULT 'Asia/Jakarta',
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, claim_date)
);

-- Ensure user_id is uuid if the table already existed as text
DO $$ 
BEGIN 
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'daily_login_rewards' AND column_name = 'user_id') = 'text' THEN
        ALTER TABLE public.daily_login_rewards ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    END IF;
END $$;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS daily_login_rewards_user_id_idx ON public.daily_login_rewards (user_id);

-- 2. VOUCHER_MILESTONES (Phase 2 Preparation)
CREATE TABLE IF NOT EXISTS public.voucher_milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    milestone_name text NOT NULL DEFAULT 'earned_500_tickets',
    total_tickets_earned integer DEFAULT 0,
    is_eligible boolean DEFAULT false,
    has_claimed boolean DEFAULT false,
    eligible_at timestamptz,
    claimed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Ensure user_id is uuid if the table already existed as text
DO $$ 
BEGIN 
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'voucher_milestones' AND column_name = 'user_id') = 'text' THEN
        ALTER TABLE public.voucher_milestones ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    END IF;
END $$;

-- Indexing for admin view
CREATE INDEX IF NOT EXISTS voucher_milestones_is_eligible_idx ON public.voucher_milestones (is_eligible) WHERE is_eligible = true;
CREATE INDEX IF NOT EXISTS voucher_milestones_user_id_idx ON public.voucher_milestones (user_id);

-- 3. RPC: claim_daily_welcome_reward
CREATE OR REPLACE FUNCTION public.claim_daily_welcome_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_jakarta_today date;
    v_already_claimed boolean;
    v_new_total integer;
BEGIN
    -- 1. Determine "Today" in Jakarta
    v_jakarta_today := (now() AT TIME ZONE 'Asia/Jakarta')::date;

    -- 2. Check eligibility
    SELECT EXISTS (
        SELECT 1 FROM public.daily_login_rewards 
        WHERE user_id = p_user_id AND claim_date = v_jakarta_today
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_claimed', true,
            'granted_ticket_count', 0
        );
    END IF;

    -- 3. ATOMIC UPDATE
    -- a) Log claim
    INSERT INTO public.daily_login_rewards (user_id, claim_date, timezone_used)
    VALUES (p_user_id, v_jakarta_today, 'Asia/Jakarta');

    -- b) Grant Ticket (+1)
    -- We update BOTH tables to maintain single source of truth (matches grantTickets logic)
    -- user_stats.user_id is already uuid
    UPDATE public.user_stats
    SET tiket = tiket + 1,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING tiket INTO v_new_total;

    -- Fallback for first-time users if user_stats row missing (though unlikely in current app flow)
    IF v_new_total IS NULL THEN
        INSERT INTO public.user_stats (user_id, tiket)
        VALUES (p_user_id, 1)
        RETURNING tiket INTO v_new_total;
    END IF;

    -- c) Sync survey_profiles
    -- survey_profiles.user_id is already uuid
    UPDATE public.survey_profiles
    SET total_tickets = total_tickets + 1
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_claimed', false,
        'granted_ticket_count', 1,
        'new_total', v_new_total,
        'claim_date', v_jakarta_today
    );
END;
$$;

-- 4. SECURITY: RLS Policies
ALTER TABLE public.daily_login_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_milestones ENABLE ROW LEVEL SECURITY;

-- Drop old policies just in case they were bound to old casts
DROP POLICY IF EXISTS "Users can view their own daily rewards" ON public.daily_login_rewards;
CREATE POLICY "Users can view their own daily rewards"
ON public.daily_login_rewards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own milestones" ON public.voucher_milestones;
CREATE POLICY "Users can view their own milestones"
ON public.voucher_milestones FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
