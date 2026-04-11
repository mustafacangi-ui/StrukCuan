-- RLS for receipts: users only see their own receipts
-- Run this in Supabase SQL Editor after receipts_setup.sql
-- Requires Supabase Auth (phone OTP or email magic link)

-- 1) Alter receipts.user_id to support auth.uid() (keep as text, we store uuid::text)
-- receipts.user_id is already text - auth.uid()::text will work

-- 2) Nicknames and profile fields: use public.user_stats (and survey_profiles where needed).
--    Do not create public.profiles — removed (see supabase/remove_profiles_migration.sql).

-- 3) Create admin_users table for admin access
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- 4) Enable RLS on receipts
alter table if exists public.receipts enable row level security;

-- 5) Drop existing policies if any
drop policy if exists "Allow select receipts" on public.receipts;
drop policy if exists "Allow insert receipts" on public.receipts;

-- 6) Users can only INSERT their own receipts (user_id must match auth.uid())
create policy "Users insert own receipts"
  on public.receipts for insert
  to authenticated
  with check (user_id = auth.uid()::text);

-- 7) Users can only SELECT their own receipts
create policy "Users select own receipts"
  on public.receipts for select
  to authenticated
  using (
    user_id = auth.uid()::text
    or exists (select 1 from public.admin_users where user_id = auth.uid())
  );

-- 8) Storage policy for receipts bucket (run in Dashboard > Storage > receipts > Policies)
-- Policy: "Users can upload to own folder"
-- INSERT: (bucket_id = 'receipts') AND ((storage.foldername(name))[1] = auth.uid()::text)
-- SELECT: allow public read

-- 9) user_stats and notifications - enable RLS for consistency
alter table if exists public.user_stats enable row level security;

create policy "Users select own stats"
  on public.user_stats for select
  to authenticated
  using (user_id = auth.uid()::text);

alter table if exists public.notifications enable row level security;

create policy "Users select own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid()::text);

-- 10) Notifications update: users can mark their own as read
create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
