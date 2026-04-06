-- 2-Stage Referral Reward System
-- Stage 1: Signup (+10 for inviter, +3 for user)
-- Stage 2: First Approved Receipt (+5 for inviter, +2 for user)

-- 1. Add Stage 1 and Stage 2 flags to user_stats
alter table public.user_stats
  add column if not exists referral_signup_rewarded boolean not null default false,
  add column if not exists referral_signup_rewarded_at timestamptz,
  add column if not exists first_receipt_referral_rewarded boolean not null default false,
  add column if not exists first_receipt_referral_rewarded_at timestamptz;

-- 2. Ensure friends_joined exists (from previous tasks, but just in case)
alter table public.user_stats
  add column if not exists friends_joined integer not null default 0;

-- 3. Disable old DB trigger to prevent double rewards
-- (Moving logic to grantTickets() frontend calls for better data integrity between user_stats & survey_profiles)
drop trigger if exists receipts_referral_reward_on_approve on public.receipts;

-- 4. Invalidate any logic that relies on reward_given in referrals table
-- We'll now use the per-user user_stats flags for Stage 2 as well, for better tracking.
-- But we'll still update the referrals.reward_given for backwards compatibility.
