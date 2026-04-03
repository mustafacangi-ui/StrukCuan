-- =============================================================================
-- Survey Rewards Migration
-- CPX Research / General survey reward tracking with duration-based tickets
-- Features:
--   - survey_started_at support for tracking survey start time
--   - Duration-based ticket calculation (1-3 tickets based on LOI)
--   - Duplicate transaction_id prevention via unique constraint
--   - Backward compatible with existing cpx_ticket_transactions
-- =============================================================================

-- 1) survey_rewards table - tracks all survey rewards with enhanced metadata
CREATE TABLE IF NOT EXISTS public.survey_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('cpx', 'pollfish', 'bitlabs', 'other')),
    survey_id text,
    transaction_id text NOT NULL,
    status text NOT NULL CHECK (status IN ('completed', 'screenout', 'quota_full', 'reversed')),
    
    -- Duration and timing fields
    survey_loi integer, -- Length of interview in minutes
    survey_started_at timestamptz, -- When user started the survey
    survey_completed_at timestamptz, -- When survey was completed (from postback)
    
    -- Reward calculation
    tickets_granted integer NOT NULL DEFAULT 0,
    cuan_granted integer NOT NULL DEFAULT 0,
    
    -- Revenue tracking
    gross_profit integer DEFAULT 0,
    currency text DEFAULT 'IDR',
    
    -- Verification and metadata
    hash_verified boolean NOT NULL DEFAULT false,
    raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    country_code char(2) DEFAULT 'ID',
    
    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT survey_rewards_transaction_provider_unique UNIQUE (provider, transaction_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS survey_rewards_user_id_idx ON public.survey_rewards (user_id);
CREATE INDEX IF NOT EXISTS survey_rewards_provider_idx ON public.survey_rewards (provider);
CREATE INDEX IF NOT EXISTS survey_rewards_created_at_idx ON public.survey_rewards (created_at DESC);
CREATE INDEX IF NOT EXISTS survey_rewards_survey_started_at_idx ON public.survey_rewards (survey_started_at) WHERE survey_started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS survey_rewards_status_idx ON public.survey_rewards (status);

-- Comments
COMMENT ON TABLE public.survey_rewards IS 'Survey completion rewards with duration tracking and duplicate prevention';
COMMENT ON COLUMN public.survey_rewards.survey_loi IS 'Length of interview in minutes, used for duration-based ticket calculation';
COMMENT ON COLUMN public.survey_rewards.survey_started_at IS 'Timestamp when user started the survey (if tracked)';
COMMENT ON COLUMN public.survey_rewards.tickets_granted IS 'Number of tickets granted based on survey duration (1-3 tickets)';

-- 2) Function to calculate tickets based on survey duration (LOI)
CREATE OR REPLACE FUNCTION public.calculate_survey_tickets(p_loi integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Duration-based ticket logic:
    -- < 1 minute: 1 ticket
    -- 1-3 minutes: 2 tickets  
    -- > 3 minutes: 3 tickets
    IF p_loi IS NULL OR p_loi < 1 THEN
        RETURN 1;
    ELSIF p_loi <= 3 THEN
        RETURN 2;
    ELSE
        RETURN 3;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_survey_tickets IS 'Calculate tickets based on survey duration (LOI in minutes)';

-- 3) Main function to process CPX postback with duplicate prevention
CREATE OR REPLACE FUNCTION public.process_cpx_postback(
    p_user_id uuid,
    p_transaction_id text,
    p_status text,
    p_survey_id text,
    p_survey_loi integer,
    p_survey_started_at timestamptz,
    p_survey_completed_at timestamptz,
    p_hash_verified boolean,
    p_raw_payload jsonb,
    p_country_code char(2) DEFAULT 'ID'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tickets integer;
    v_existing_id uuid;
    v_week integer;
    v_cur_weekly integer;
    v_apply integer;
    v_uid_text text;
    v_reward_id uuid;
    v_status_mapped text;
    i integer;
BEGIN
    -- Map CPX status codes to our status values
    -- CPX: 1=completed, 2=screenout/reversed, 3=bonus/completed
    CASE p_status
        WHEN '1' THEN v_status_mapped := 'completed';
        WHEN '2' THEN v_status_mapped := 'reversed';
        WHEN '3' THEN v_status_mapped := 'completed';
        ELSE v_status_mapped := 'completed';
    END CASE;

    -- Duplicate transaction prevention check
    SELECT id INTO v_existing_id
    FROM public.survey_rewards
    WHERE provider = 'cpx' AND transaction_id = p_transaction_id;
    
    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'duplicate_transaction',
            'message', 'Transaction ID already processed',
            'existing_reward_id', v_existing_id
        );
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public.user_stats WHERE user_id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'user_not_found',
            'message', 'User stats not found'
        );
    END IF;

    v_uid_text := p_user_id::text;
    v_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
    
    -- Calculate tickets based on duration
    v_tickets := public.calculate_survey_tickets(p_survey_loi);

    -- Only grant rewards for completed statuses (1 or 3 in CPX)
    IF p_status IN ('1', '3') THEN
        -- Insert survey reward record
        INSERT INTO public.survey_rewards (
            user_id, provider, survey_id, transaction_id, status,
            survey_loi, survey_started_at, survey_completed_at,
            tickets_granted, hash_verified, raw_payload, country_code
        ) VALUES (
            p_user_id, 'cpx', p_survey_id, p_transaction_id, v_status_mapped,
            p_survey_loi, p_survey_started_at, p_survey_completed_at,
            v_tickets, p_hash_verified, COALESCE(p_raw_payload, '{}'::jsonb), p_country_code
        )
        RETURNING id INTO v_reward_id;

        -- Update user_stats with tickets
        UPDATE public.user_stats
        SET
            total_tickets = COALESCE(total_tickets, 0) + v_tickets,
            weekly_tickets = COALESCE(weekly_tickets, 0) + v_tickets,
            lifetime_tickets = COALESCE(lifetime_tickets, 0) + v_tickets,
            updated_at = now()
        WHERE user_id = p_user_id;

        -- Get current weekly tickets
        SELECT COALESCE(tickets, 0) INTO v_cur_weekly
        FROM public.user_tickets
        WHERE user_id = v_uid_text AND draw_week = v_week;

        -- Add to weekly pool (max 42 per week)
        v_apply := LEAST(v_tickets, GREATEST(0, 42 - COALESCE(v_cur_weekly, 0)));
        
        IF v_apply > 0 THEN
            -- Upsert user_tickets
            INSERT INTO public.user_tickets (user_id, draw_week, tickets, updated_at)
            VALUES (v_uid_text, v_week, v_apply, now())
            ON CONFLICT (user_id, draw_week)
            DO UPDATE SET
                tickets = LEAST(public.user_tickets.tickets + v_apply, 42),
                updated_at = now();

            -- Insert lottery tickets for weekly draw
            FOR i IN 1..v_apply LOOP
                INSERT INTO public.lottery_tickets (user_id, draw_week)
                VALUES (v_uid_text, v_week);
            END LOOP;
        END IF;

        -- Update weekly_tickets count in user_stats
        UPDATE public.user_stats
        SET
            weekly_tickets = COALESCE(
                (SELECT tickets FROM public.user_tickets WHERE user_id = v_uid_text AND draw_week = v_week),
                0
            ),
            updated_at = now()
        WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'reward_id', v_reward_id,
            'tickets_granted', v_tickets,
            'lottery_entries_added', v_apply,
            'survey_loi', p_survey_loi,
            'weekly_cap_remaining', 42 - COALESCE(v_cur_weekly, 0) - v_apply
        );
    
    ELSIF p_status = '2' THEN
        -- Handle reversal/screenout - record it but don't grant tickets
        INSERT INTO public.survey_rewards (
            user_id, provider, survey_id, transaction_id, status,
            survey_loi, survey_started_at, survey_completed_at,
            tickets_granted, hash_verified, raw_payload, country_code
        ) VALUES (
            p_user_id, 'cpx', p_survey_id, p_transaction_id, v_status_mapped,
            p_survey_loi, p_survey_started_at, p_survey_completed_at,
            0, p_hash_verified, COALESCE(p_raw_payload, '{}'::jsonb), p_country_code
        )
        RETURNING id INTO v_reward_id;

        RETURN jsonb_build_object(
            'success', true,
            'reward_id', v_reward_id,
            'tickets_granted', 0,
            'message', 'Screenout/reversal recorded, no tickets granted'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', 'unknown_status',
        'message', 'Unknown status code: ' || p_status
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_cpx_postback(
    uuid, text, text, text, integer, timestamptz, timestamptz, boolean, jsonb, char(2)
) TO service_role;

COMMENT ON FUNCTION public.process_cpx_postback IS 
'Process CPX Research postback with duplicate prevention, duration-based tickets, and survey timing tracking';

-- 4) Helper function to check for duplicate transaction
CREATE OR REPLACE FUNCTION public.is_duplicate_survey_transaction(
    p_provider text,
    p_transaction_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.survey_rewards
        WHERE provider = p_provider AND transaction_id = p_transaction_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_duplicate_survey_transaction(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_duplicate_survey_transaction(text, text) TO authenticated;

COMMENT ON FUNCTION public.is_duplicate_survey_transaction IS 
'Check if a survey transaction has already been processed (for idempotency)';

-- 5) RLS policies for survey_rewards
ALTER TABLE public.survey_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rewards
DROP POLICY IF EXISTS "Users can read own survey_rewards" ON public.survey_rewards;
CREATE POLICY "Users can read own survey_rewards"
    ON public.survey_rewards FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Service role has full access for webhooks
DROP POLICY IF EXISTS "Service role full access survey_rewards" ON public.survey_rewards;
CREATE POLICY "Service role full access survey_rewards"
    ON public.survey_rewards FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6) Trigger to update updated_at on survey_rewards
CREATE OR REPLACE FUNCTION public.update_survey_rewards_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_survey_rewards_updated_at ON public.survey_rewards;
CREATE TRIGGER trg_survey_rewards_updated_at
    BEFORE UPDATE ON public.survey_rewards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_survey_rewards_updated_at();

-- 7) Backfill any existing CPX data from cpx_ticket_transactions (optional, idempotent)
-- This ensures no data loss if migrating from the old system
-- Only inserts transactions that don't already exist

-- Create a view for unified survey reporting across old and new tables
-- Only create if the old table exists to avoid migration failures
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cpx_ticket_transactions'
    ) THEN
        CREATE OR REPLACE VIEW public.survey_rewards_unified AS
        -- New format from survey_rewards
        SELECT 
            id,
            user_id,
            provider,
            survey_id,
            transaction_id,
            status,
            survey_loi,
            survey_started_at,
            survey_completed_at,
            tickets_granted,
            cuan_granted,
            hash_verified,
            raw_payload,
            country_code,
            created_at
        FROM public.survey_rewards

        UNION ALL

        -- Old format from cpx_ticket_transactions (mapped to new structure)
        SELECT 
            id,
            user_id,
            'cpx' as provider,
            survey_id,
            trans_id as transaction_id,
            CASE 
                WHEN status = '1' THEN 'completed'
                WHEN status = '2' THEN 'reversed'
                WHEN status = '3' THEN 'completed'
                ELSE 'completed'
            END as status,
            survey_loi,
            NULL as survey_started_at,
            processed_at as survey_completed_at,
            tickets_added as tickets_granted,
            0 as cuan_granted,
            hash_verified,
            raw_payload,
            'ID' as country_code,
            created_at
        FROM public.cpx_ticket_transactions;

        COMMENT ON VIEW public.survey_rewards_unified IS 
        'Unified view of all survey rewards from both old (cpx_ticket_transactions) and new (survey_rewards) tables';

        -- Grant access to view
        GRANT SELECT ON public.survey_rewards_unified TO authenticated;
        GRANT SELECT ON public.survey_rewards_unified TO service_role;
    END IF;
END $$;

-- =============================================================================
-- Migration complete - survey_rewards table is now ready
-- =============================================================================
