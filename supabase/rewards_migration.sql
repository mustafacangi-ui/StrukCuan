-- Rewards and engagement system migration
-- Run in Supabase SQL Editor after receipts_setup.sql and rls_receipts.sql

-- 1) Add total_receipts and level to user_stats
alter table public.user_stats
  add column if not exists total_receipts integer not null default 0,
  add column if not exists level integer not null default 1;

-- 2) Backfill total_receipts from receipts count (for existing data)
update public.user_stats us
set total_receipts = (
  select count(*)::integer from public.receipts r where r.user_id = us.user_id
)
where total_receipts = 0 or total_receipts is null;

-- 3) Function to calculate level from total_receipts
-- Level 1: 0, Level 2: 5, Level 3: 15, Level 4: 30, Level 5: 60+
create or replace function public.level_from_receipts(p_total integer)
returns integer
language plpgsql immutable
as $$
begin
  if p_total >= 60 then return 5;
  elsif p_total >= 30 then return 4;
  elsif p_total >= 15 then return 3;
  elsif p_total >= 5 then return 2;
  else return 1;
  end if;
end;
$$;

-- 4) Trigger: on receipt INSERT, update user_stats with +10 cuan, +1 ticket
create or replace function public.on_receipt_insert_reward()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_stats (user_id, cuan, tiket, total_receipts, level)
  values (new.user_id, 10, 1, 1, 1)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + 10,
    tiket = public.user_stats.tiket + 1,
    total_receipts = public.user_stats.total_receipts + 1,
    level = public.level_from_receipts(public.user_stats.total_receipts + 1),
    updated_at = now();

  insert into public.notifications (user_id, title, message)
  values (
    new.user_id,
    'Struk Diterima!',
    'Kamu dapat +10 Cuan dan +1 Tiket. Terus kumpulkan!'
  );

  return new;
end;
$$;

drop trigger if exists trg_receipt_insert_reward on public.receipts;
create trigger trg_receipt_insert_reward
  after insert on public.receipts
  for each row execute function public.on_receipt_insert_reward();

-- 5) Update approve_receipt: only change status, no rewards (rewards given on insert)
create or replace function public.approve_receipt(p_receipt_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update public.receipts
  set status = 'approved'
  where id = p_receipt_id and status = 'pending';
end;
$$;

-- 6) Leaderboard: allow authenticated users to read all user_stats
drop policy if exists "Users select own stats" on public.user_stats;
create policy "Users can read user_stats"
  on public.user_stats for select
  to authenticated
  using (true);
