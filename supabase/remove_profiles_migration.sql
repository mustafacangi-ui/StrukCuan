-- =============================================================================
-- Remove legacy public.profiles; use user_stats.nickname (+ survey_profiles).
-- Run once in Supabase SQL Editor after deploying app changes.
-- =============================================================================

-- 1) Replace ad log helper first (must not reference profiles before table drop)
CREATE OR REPLACE FUNCTION public.get_latest_ad_logs(p_limit int DEFAULT 50)
RETURNS TABLE (
    id uuid,
    user_id text,
    nickname text,
    provider_name text,
    status text,
    reward_granted boolean,
    completion_duration_seconds integer,
    ad_started_at timestamptz,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.user_id,
        s.nickname,
        v.provider_name,
        v.status,
        v.reward_granted,
        v.completion_duration_seconds,
        v.ad_started_at,
        v.metadata
    FROM public.ad_views v
    LEFT JOIN public.user_stats s ON v.user_id = s.user_id::text
    ORDER BY v.ad_started_at DESC
    LIMIT p_limit;
END;
$$;

-- 2) Drop profiles and its policies (CASCADE removes dependent policies)
DROP TABLE IF EXISTS public.profiles CASCADE;
