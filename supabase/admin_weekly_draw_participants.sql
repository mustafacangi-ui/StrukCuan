-- Admin Panel: Resilient Weekly Draw Participants RPC
-- Handles missing tables (lottery_tickets, referrals, receipts, deals) gracefully.

CREATE OR REPLACE FUNCTION public.get_admin_weekly_draw_participants()
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  ticket_count INT,
  weekly_entries BIGINT,
  approved_receipts BIGINT,
  approved_deals BIGINT,
  invited_friends BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lottery_sql TEXT := 's.tiket::bigint';
    v_referrals_sql TEXT := '0::bigint';
    v_receipts_sql TEXT := '0::bigint';
    v_deals_sql TEXT := '0::bigint';
BEGIN
    -- 1. Check for optional table existence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lottery_tickets') THEN
        v_lottery_sql := '(SELECT COUNT(*) FROM public.lottery_tickets lt WHERE lt.user_id::text = s.user_id::text)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') THEN
        v_referrals_sql := '(SELECT COUNT(*) FROM public.referrals ref WHERE ref.referrer_user_id::text = s.user_id::text)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        v_receipts_sql := '(SELECT COUNT(*) FROM public.receipts r WHERE r.user_id::text = s.user_id::text AND r.status = ''approved'')';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
        -- Safely handle both 'active' or 'approved' statuses if used interchangeably
        v_deals_sql := '(SELECT COUNT(*) FROM public.deals d WHERE d.user_id::text = s.user_id::text AND (d.status = ''active'' OR d.status = ''approved''))';
    END IF;

    -- 2. Execute Dynamic Query
    RETURN QUERY EXECUTE format('
        SELECT 
            s.user_id::UUID,
            COALESCE(p.nickname, s.nickname, ''User'')::TEXT as nickname,
            COALESCE(s.tiket, 0)::INT as ticket_count,
            (%s)::BIGINT as weekly_entries,
            (%s)::BIGINT as approved_receipts,
            (%s)::BIGINT as approved_deals,
            (%s)::BIGINT as invited_friends
        FROM public.user_stats s
        LEFT JOIN public.survey_profiles p ON s.user_id::text = p.user_id::text
        ORDER BY s.tiket DESC NULLS LAST
        LIMIT 10', v_lottery_sql, v_receipts_sql, v_deals_sql, v_referrals_sql);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_admin_weekly_draw_participants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_weekly_draw_participants() TO service_role;
