-- Admin Panel: Weekly Draw Participants RPC
-- Aggregates top participants with their ticket totals and activity metrics.

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
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id::UUID,
    COALESCE(p.nickname, 'User') as nickname,
    s.tiket as ticket_count,
    -- Count entries in lottery_tickets for the user
    (SELECT COUNT(*) FROM public.lottery_tickets lt WHERE lt.user_id = s.user_id::text) as weekly_entries,
    -- Count approved receipts
    (SELECT COUNT(*) FROM public.receipts r WHERE r.user_id = s.user_id::text AND r.status = 'approved') as approved_receipts,
    -- Count active deals (approved)
    (SELECT COUNT(*) FROM public.deals d WHERE d.user_id = s.user_id::text AND d.status = 'active') as approved_deals,
    -- Count invited friends (referrals)
    (SELECT COUNT(*) FROM public.referrals ref WHERE ref.referrer_user_id = s.user_id::text) as invited_friends
  FROM public.user_stats s
  LEFT JOIN public.survey_profiles p ON s.user_id = p.user_id
  ORDER BY s.tiket DESC
  LIMIT 10;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_admin_weekly_draw_participants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_weekly_draw_participants() TO service_role;
