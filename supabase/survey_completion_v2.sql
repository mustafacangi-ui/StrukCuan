-- =============================================================================
-- Unified Survey Completion & Reward System (v2)
-- Handles CPX Research, BitLabs, and other survey providers.
-- Implements payout-based ticket rewards:
--   payout < 0.20 => 1 ticket
--   payout 0.20 - 0.75 => 2 tickets
--   payout > 0.75 => 3 tickets
-- =============================================================================

-- 1) Helper function to calculate tickets from USD payout
CREATE OR REPLACE FUNCTION public.calculate_tickets_from_payout(p_payout numeric)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_payout < 0.20 THEN RETURN 1;
    ELSIF p_payout <= 0.75 THEN RETURN 2;
    ELSE RETURN 3;
    END IF;
END;
$$;

-- 2) Core function to process any survey completion
CREATE OR REPLACE FUNCTION public.process_survey_completion(
    p_user_id uuid,
    p_provider text,
    p_transaction_id text,
    p_payout numeric,
    p_status text,
    p_loi integer DEFAULT NULL,
    p_survey_id text DEFAULT NULL,
    p_country_code char(2) DEFAULT 'ID',
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tickets integer;
    v_existing_id uuid;
    v_reward_id uuid;
    v_status_mapped text;
    v_week integer;
    v_uid_text text;
    v_cur_weekly integer;
    v_apply integer;
    i integer;
BEGIN
    -- 1. Status Mapping (Provider specific)
    -- BitLabs: 'completed', 'screenout', etc.
    -- CPX: '1' (completed), '3' (bonus/completed), '2' (reversed)
    IF p_provider = 'cpx' THEN
        CASE p_status
            WHEN '1' THEN v_status_mapped := 'completed';
            WHEN '3' THEN v_status_mapped := 'completed';
            WHEN '2' THEN v_status_mapped := 'reversed';
            ELSE v_status_mapped := 'abandoned'; -- Fallback
        END CASE;
    ELSIF p_provider = 'bitlabs' THEN
        v_status_mapped := p_status;
    ELSE
        v_status_mapped := p_status;
    END IF;

    -- 2. Duplicate Prevention
    SELECT id INTO v_existing_id
    FROM public.survey_rewards
    WHERE provider = p_provider AND transaction_id = p_transaction_id;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'duplicate_transaction',
            'reward_id', v_existing_id
        );
    END IF;

    -- 3. Calculate Tickets
    v_tickets := public.calculate_tickets_from_payout(p_payout);

    -- 4. Initial Setup
    v_uid_text := p_user_id::text;
    v_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

    -- 5. Process Completed Surveys
    IF v_status_mapped = 'completed' THEN
        -- Insert Reward Record
        INSERT INTO public.survey_rewards (
            user_id, provider, survey_id, transaction_id, status,
            survey_loi, tickets_granted, cuan_granted, gross_profit,
            raw_payload, country_code
        ) VALUES (
            p_user_id, p_provider, p_survey_id, p_transaction_id, v_status_mapped,
            p_loi, v_tickets, 0, (p_payout * 1000)::integer, -- payout as cents/milli
            p_metadata, p_country_code
        )
        RETURNING id INTO v_reward_id;

        -- Update user_stats tickets (total balance)
        UPDATE public.user_stats
        SET
            total_tickets = COALESCE(total_tickets, 0) + v_tickets,
            tiket = COALESCE(tiket, 0) + v_tickets,
            lifetime_tickets = COALESCE(lifetime_tickets, 0) + v_tickets,
            updated_at = now()
        WHERE user_id = p_user_id;

        -- Weekly Pool & Lottery Entries
        SELECT COALESCE(tickets, 0) INTO v_cur_weekly
        FROM public.user_tickets
        WHERE user_id = v_uid_text AND draw_week = v_week;

        v_apply := LEAST(v_tickets, GREATEST(0, 42 - COALESCE(v_cur_weekly, 0)));
        
        IF v_apply > 0 THEN
            -- Upsert weekly ticket count
            INSERT INTO public.user_tickets (user_id, draw_week, tickets, updated_at)
            VALUES (v_uid_text, v_week, v_apply, now())
            ON CONFLICT (user_id, draw_week)
            DO UPDATE SET
                tickets = LEAST(public.user_tickets.tickets + v_apply, 42),
                updated_at = now();

            -- Generate lottery ballots
            FOR i IN 1..v_apply LOOP
                INSERT INTO public.lottery_tickets (user_id, draw_week)
                VALUES (v_uid_text, v_week);
            END LOOP;
        END IF;

        -- Sync weekly_tickets in user_stats
        UPDATE public.user_stats
        SET
            weekly_tickets = COALESCE(
                (SELECT tickets FROM public.user_tickets WHERE user_id = v_uid_text AND draw_week = v_week),
                0
            ),
            updated_at = now()
        WHERE user_id = p_user_id;

        -- Create notification for user
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (
            p_user_id,
            'Survey Completed!',
            format('You earned %s tickets for your survey. Good luck in the weekly draw!', v_tickets)
        );

        RETURN jsonb_build_object(
            'success', true,
            'reward_id', v_reward_id,
            'tickets_granted', v_tickets,
            'lottery_entries', v_apply,
            'status', v_status_mapped
        );
    
    ELSE
        -- Log non-completion (Rejected, Screenout, etc.)
        INSERT INTO public.survey_rewards (
            user_id, provider, survey_id, transaction_id, status,
            survey_loi, tickets_granted, raw_payload, country_code
        ) VALUES (
            p_user_id, p_provider, p_survey_id, p_transaction_id, v_status_mapped,
            p_loi, 0, p_metadata, p_country_code
        )
        RETURNING id INTO v_reward_id;

        RETURN jsonb_build_object(
            'success', true,
            'reward_id', v_reward_id,
            'tickets_granted', 0,
            'status', v_status_mapped,
            'message', 'Survey outcome recorded, no reward granted.'
        );
    END IF;

END;
$$;

-- 3) Replace the old legacy callback to point to this new logic
CREATE OR REPLACE FUNCTION public.survey_completion_callback(
  p_user_id text,
  p_provider text,
  p_user_cuan integer,
  p_gross_profit integer,
  p_transaction_id text DEFAULT NULL,
  p_survey_id text DEFAULT NULL,
  p_country_code char(2) DEFAULT 'ID',
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a wrapper around the new v2 system to maintain compatibility with the Edge Function
    -- Note: We treat p_user_cuan as the payout / 100 if it comes from a legacy source,
    -- but ideally the edge function should call process_survey_completion directly.
    RETURN public.process_survey_completion(
        p_user_id::uuid,
        p_provider,
        p_transaction_id,
        (p_user_cuan::numeric / 100.0), -- If passed as integer cents
        COALESCE(p_metadata->>'status', 'completed'),
        (p_metadata->>'loi')::integer,
        p_survey_id,
        p_country_code,
        p_metadata
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_survey_completion TO service_role;
GRANT EXECUTE ON FUNCTION public.process_survey_completion TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_completion_callback TO service_role;
GRANT EXECUTE ON FUNCTION public.survey_completion_callback TO authenticated;
