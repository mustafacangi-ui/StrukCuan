-- Rewarded Ads Monetization Schema Proposal (V2 - Extended Anti-Abuse)
-- 1. AD_VIEWS (Enhanced Audit Trail)
CREATE TABLE IF NOT EXISTS public.ad_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    provider_name text NOT NULL, -- 'applovin', 'admob', 'unity', 'demo'
    ad_unit_id text,
    status text NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    reward_granted boolean DEFAULT false,
    error_message text,
    
    -- Anti-Abuse Tracking
    ad_started_at timestamptz NOT NULL DEFAULT now(),
    ad_completed_at timestamptz,
    completion_duration_seconds integer, -- Calculated as (completed_at - started_at)
    
    -- Revenue Estimation
    revenue_estimate numeric DEFAULT 0,
    currency text DEFAULT 'USD',
    
    -- Metadata (Rich Progress Tracking)
    metadata jsonb DEFAULT '{
        "stepCount": 3,
        "completedSteps": 0,
        "closeReason": "none"
    }'::jsonb
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS ad_views_user_id_idx ON public.ad_views (user_id);
CREATE INDEX IF NOT EXISTS ad_views_status_idx ON public.ad_views (status);
CREATE INDEX IF NOT EXISTS ad_views_ad_started_at_idx ON public.ad_views (ad_started_at DESC);

-- 2. AD_DAILY_STATS (Anti-abuse / Daily Capping)
CREATE TABLE IF NOT EXISTS public.ad_daily_stats (
    user_id text NOT NULL,
    day date NOT NULL DEFAULT current_date,
    view_count integer NOT NULL DEFAULT 0,
    total_revenue_est numeric NOT NULL DEFAULT 0,
    last_view_at timestamptz,
    PRIMARY KEY (user_id, day)
);

-- 3. REWARD_EVENTS (Audit log for ticket grants)
CREATE TABLE IF NOT EXISTS public.reward_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    source_type text NOT NULL CHECK (source_type IN ('ad', 'referral', 'survey', 'shake')),
    source_id uuid, -- ID of the ad_view
    tickets_granted integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. FUNCTION: grant_ad_reward (Refined Validation)
CREATE OR REPLACE FUNCTION public.grant_ad_reward(
    p_user_id text,
    p_ad_view_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ad_record record;
    v_daily_count integer;
BEGIN
    -- 1. Fetch current ad view record
    SELECT * INTO v_ad_record 
    FROM public.ad_views 
    WHERE id = p_ad_view_id AND user_id = p_user_id;

    IF v_ad_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_ad_id');
    END IF;

    -- 2. Verify Completion
    IF v_ad_record.status != 'completed' OR v_ad_record.reward_granted = true THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_processed_or_incomplete');
    END IF;

    -- 3. Duration Validation (Anti-Abuse)
    -- Reject if duration is suspiciously fast (e.g., < 3 seconds for demo, < 15 for real)
    IF v_ad_record.completion_duration_seconds < (CASE WHEN v_ad_record.provider_name = 'demo' THEN 3 ELSE 15 END) THEN
        RETURN jsonb_build_object('success', false, 'error', 'suspiciously_fast_completion');
    END IF;

    -- 4. Verify Metadata Steps
    IF (v_ad_record.metadata->>'completedSteps')::int < (v_ad_record.metadata->>'stepCount')::int THEN
        RETURN jsonb_build_object('success', false, 'error', 'steps_incomplete');
    END IF;

    -- 5. Daily Cap Check
    SELECT COALESCE(view_count, 0) INTO v_daily_count
    FROM public.ad_daily_stats
    WHERE user_id = p_user_id AND day = current_date;

    IF v_daily_count >= 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'daily_cap_reached');
    END IF;

    -- 6. ATOMIC GRANT
    -- a) Update View Record
    UPDATE public.ad_views SET reward_granted = true WHERE id = p_ad_view_id;

    -- b) Update Daily Stats
    INSERT INTO public.ad_daily_stats (user_id, day, view_count, total_revenue_est, last_view_at)
    VALUES (p_user_id, current_date, 1, v_ad_record.revenue_estimate, now())
    ON CONFLICT (user_id, day) DO UPDATE SET
        view_count = public.ad_daily_stats.view_count + 1,
        total_revenue_est = public.ad_daily_stats.total_revenue_est + v_ad_record.revenue_estimate,
        last_view_at = now();

    -- c) Log reward event
    INSERT INTO public.reward_events (user_id, source_type, source_id, tickets_granted)
    VALUES (p_user_id, 'ad', p_ad_view_id, 1);

    -- d) Increment user tickets
    UPDATE public.user_stats
    SET tiket = tiket + 1,
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'tickets_added', 1, 
        'daily_total', v_daily_count + 1
    );
END;
$$;
