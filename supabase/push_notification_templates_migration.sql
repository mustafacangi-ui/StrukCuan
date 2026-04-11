-- =============================================================================
-- Push Notification Templates (automated scheduled push system)
-- =============================================================================
-- Run in Supabase SQL Editor.
--
-- schedule_hour_wib : 0-23 (Jakarta WIB hour to fire)
-- schedule_days     : 'daily' | 'sunday' | 'weekday' | 'weekend'
-- audience          : segment key (same values as scheduled_push_notifications.segment)
-- enabled           : cron will send only when true
-- last_sent_at      : updated by cron after each send; prevents double-fire same day
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_notification_templates (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key     TEXT         UNIQUE NOT NULL,
  name             TEXT         NOT NULL,
  title            TEXT         NOT NULL,
  body             TEXT         NOT NULL,
  schedule_hour_wib INTEGER     NOT NULL DEFAULT 12 CHECK (schedule_hour_wib BETWEEN 0 AND 23),
  schedule_days    TEXT         NOT NULL DEFAULT 'daily',
  audience         TEXT         NOT NULL DEFAULT 'all',
  enabled          BOOLEAN      NOT NULL DEFAULT FALSE,
  last_sent_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tpl_enabled ON public.push_notification_templates (enabled);
CREATE INDEX IF NOT EXISTS idx_push_tpl_key    ON public.push_notification_templates (template_key);

ALTER TABLE public.push_notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access push templates" ON public.push_notification_templates;
CREATE POLICY "Admins full access push templates"
  ON public.push_notification_templates FOR ALL
  USING  ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = TRUE)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = TRUE);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_push_tpl_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_push_tpl_updated_at ON public.push_notification_templates;
CREATE TRIGGER trg_push_tpl_updated_at
  BEFORE UPDATE ON public.push_notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_push_tpl_updated_at();

-- =============================================================================
-- Seed: 8 default templates (idempotent)
-- =============================================================================
INSERT INTO public.push_notification_templates
  (template_key, name, title, body, schedule_hour_wib, schedule_days, audience, enabled)
VALUES
  ('daily_noon',
   'Daily Noon Reminder',
   'StrukCuan',
   'Have you completed today''s tasks? Earn your tickets now.',
   5, 'daily', 'inactive_today', FALSE),

  ('evening_reminder',
   'Evening Reminder',
   'StrukCuan',
   'Don''t forget to scan your receipts today! Every receipt = 1 ticket.',
   12, 'daily', 'inactive_today', FALSE),

  ('sunday_draw_reminder',
   'Sunday Draw Reminder',
   'StrukCuan — Draw Day! 🎟️',
   'Today is draw day. Complete your tasks before tonight''s draw at 21:00 WIB.',
   3, 'sunday', 'all', FALSE),

  ('final_draw_countdown',
   'Final Draw Countdown',
   'StrukCuan — Last Chance! ⏳',
   'Only hours until the weekly draw! Last chance to earn tickets before 21:00 WIB.',
   11, 'sunday', 'has_entries', FALSE),

  ('new_survey',
   'New Survey Available',
   'StrukCuan — New Survey',
   'A new survey is waiting for you. Complete it now and earn bonus tickets!',
   5, 'daily', 'pending_surveys', FALSE),

  ('red_label_nearby',
   'Red Label Nearby',
   'StrukCuan — 🔴 Deal Nearby',
   'A red label deal was just shared near you. Check it out and share yours too!',
   5, 'daily', 'near_red_label', FALSE),

  ('almost_next_entry',
   'Almost Next Entry',
   'StrukCuan — Almost There!',
   'Only 1–2 more tickets needed for your next draw entry. Keep scanning!',
   5, 'daily', 'almost_entry', FALSE),

  ('winner_announcement',
   'Winner Announcement',
   'StrukCuan — Draw Results 🏆',
   'This week''s draw winners are announced! Check if your draw code won.',
   14, 'sunday', 'all', FALSE)

ON CONFLICT (template_key) DO NOTHING;
