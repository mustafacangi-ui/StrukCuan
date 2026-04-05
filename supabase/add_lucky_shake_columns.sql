-- Add Lucky Shake tracking columns to user_stats table
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS shake_last_reward integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shake_total_tickets integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shake_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shake_days_this_week integer DEFAULT 0;
