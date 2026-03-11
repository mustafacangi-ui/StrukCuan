-- Daily missions and streak system
-- Run after rewards_migration.sql

-- 1) Create daily_missions table
create table if not exists public.daily_missions (
  user_id text not null,
  mission_date date not null,
  completed boolean not null default false,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, mission_date)
);

create index if not exists daily_missions_user_date_idx on public.daily_missions (user_id, mission_date);

-- 2) Add streak columns to user_stats
alter table public.user_stats
  add column if not exists current_streak integer not null default 0,
  add column if not exists last_upload_date date;

-- 3) Replace receipt trigger with mission + streak logic
create or replace function public.on_receipt_insert_reward()
returns trigger
language plpgsql
security definer
as $$
declare
  v_today date := (new.created_at at time zone 'Asia/Jakarta')::date;
  v_receipts_today integer;
  v_last_date date;
  v_new_streak integer;
  v_streak_bonus integer := 0;
begin
  -- Base reward: +10 cuan, +1 ticket
  insert into public.user_stats (user_id, cuan, tiket, total_receipts, level)
  values (new.user_id, 10, 1, 1, 1)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + 10,
    tiket = public.user_stats.tiket + 1,
    total_receipts = public.user_stats.total_receipts + 1,
    level = public.level_from_receipts(public.user_stats.total_receipts + 1),
    updated_at = now();

  -- Count receipts today (including this one) - if 1, it's first of day
  select count(*) into v_receipts_today
  from public.receipts
  where user_id = new.user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

  -- Daily mission: first receipt of day = +5 cuan
  if v_receipts_today = 1 then
    insert into public.daily_missions (user_id, mission_date, completed, reward_claimed)
    values (new.user_id, v_today, true, true)
    on conflict (user_id, mission_date)
    do update set completed = true, reward_claimed = true;

    -- Add +5 cuan for mission
    update public.user_stats
    set cuan = cuan + 5, updated_at = now()
    where user_id = new.user_id;
  end if;

  -- Streak logic: only update on first receipt of day
  if v_receipts_today = 1 then
    select last_upload_date into v_last_date
    from public.user_stats where user_id = new.user_id;

    if v_last_date is null then
      v_new_streak := 1;
    elsif v_last_date = v_today then
      -- same day, keep streak (shouldn't happen for first receipt)
      v_new_streak := (select current_streak from public.user_stats where user_id = new.user_id);
    elsif v_last_date = v_today - 1 then
      -- consecutive day
      v_new_streak := (select current_streak from public.user_stats where user_id = new.user_id) + 1;
    else
      -- missed day(s)
      v_new_streak := 1;
    end if;

    -- Streak bonuses: 3→+10, 7→+30, 14→+70
    if v_new_streak = 3 then v_streak_bonus := 10;
    elsif v_new_streak = 7 then v_streak_bonus := 30;
    elsif v_new_streak = 14 then v_streak_bonus := 70;
    end if;

    update public.user_stats
    set
      current_streak = v_new_streak,
      last_upload_date = v_today,
      cuan = cuan + v_streak_bonus,
      updated_at = now()
    where user_id = new.user_id;

    if v_streak_bonus > 0 then
      insert into public.notifications (user_id, title, message)
      values (
        new.user_id,
        'Streak Bonus!',
        v_new_streak || ' hari berturut-turut! Kamu dapat +' || v_streak_bonus || ' Cuan.'
      );
    end if;
  end if;

  insert into public.notifications (user_id, title, message)
  values (
    new.user_id,
    'Struk Diterima!',
    'Kamu dapat +10 Cuan dan +1 Tiket. Terus kumpulkan!'
  );

  return new;
end;
$$;

-- 4) RLS for daily_missions
alter table public.daily_missions enable row level security;

create policy "Users can read own missions"
  on public.daily_missions for select
  to authenticated
  using (user_id = auth.uid()::text);

-- Inserts/updates done by trigger (security definer) - no user policies needed
