-- Weekly lottery model - remove cuan, tickets only
-- Run after daily_missions_streak.sql

-- 1) Create weekly_lottery table
create table if not exists public.weekly_lottery (
  id bigserial primary key,
  draw_date date not null,
  winner_user_id text not null,
  tickets_used integer not null,
  reward_amount integer not null default 100000,
  created_at timestamptz not null default now()
);

create index if not exists weekly_lottery_draw_date_idx on public.weekly_lottery (draw_date);

-- 2) Replace receipt trigger: tickets only, no cuan
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
  v_streak_bonus_tickets integer := 0;
begin
  -- Base reward: +1 ticket only
  insert into public.user_stats (user_id, tiket, total_receipts, level)
  values (new.user_id, 1, 1, 1)
  on conflict (user_id)
  do update set
    tiket = public.user_stats.tiket + 1,
    total_receipts = public.user_stats.total_receipts + 1,
    level = public.level_from_receipts(public.user_stats.total_receipts + 1),
    updated_at = now();

  -- Count receipts today (including this one)
  select count(*) into v_receipts_today
  from public.receipts
  where user_id = new.user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

  -- Daily mission: first receipt of day = mark complete (no cuan reward)
  if v_receipts_today = 1 then
    insert into public.daily_missions (user_id, mission_date, completed, reward_claimed)
    values (new.user_id, v_today, true, true)
    on conflict (user_id, mission_date)
    do update set completed = true, reward_claimed = true;

    -- Streak logic: ticket bonuses for milestones
    select last_upload_date into v_last_date
    from public.user_stats where user_id = new.user_id;

    if v_last_date is null then
      v_new_streak := 1;
    elsif v_last_date = v_today then
      v_new_streak := (select current_streak from public.user_stats where user_id = new.user_id);
    elsif v_last_date = v_today - 1 then
      v_new_streak := (select current_streak from public.user_stats where user_id = new.user_id) + 1;
    else
      v_new_streak := 1;
    end if;

    -- Streak ticket bonuses: 3→+1, 7→+2, 14→+3
    if v_new_streak = 3 then v_streak_bonus_tickets := 1;
    elsif v_new_streak = 7 then v_streak_bonus_tickets := 2;
    elsif v_new_streak = 14 then v_streak_bonus_tickets := 3;
    end if;

    update public.user_stats
    set
      current_streak = v_new_streak,
      last_upload_date = v_today,
      tiket = tiket + v_streak_bonus_tickets,
      updated_at = now()
    where user_id = new.user_id;

    if v_streak_bonus_tickets > 0 then
      insert into public.notifications (user_id, title, message)
      values (
        new.user_id,
        'Streak Bonus!',
        v_new_streak || ' hari berturut-turut! Kamu dapat +' || v_streak_bonus_tickets || ' tiket.'
      );
    end if;
  end if;

  insert into public.notifications (user_id, title, message)
  values (
    new.user_id,
    'Struk Diterima!',
    'Kamu dapat +1 Tiket Undian. Semoga beruntung!'
  );

  return new;
end;
$$;

-- 3) RPC: Run weekly lottery draw (call manually or via cron on Sunday)
create or replace function public.run_weekly_lottery()
returns void
language plpgsql
security definer
as $$
declare
  v_draw_date date := (now() at time zone 'Asia/Jakarta')::date;
  v_winner record;
  v_total bigint;
  v_rnd bigint;
  v_cum bigint;
  v_picked text[] := '{}';
  v_i integer;
begin
  v_total := (select coalesce(sum(tiket), 0) from public.user_stats where tiket > 0);
  if v_total = 0 then return; end if;

  for v_i in 1..5 loop
    v_rnd := floor(random() * v_total::numeric)::bigint;
    v_cum := 0;

    for v_winner in
      select user_id, tiket from public.user_stats
      where tiket > 0 and not (user_id = any(v_picked))
    loop
      v_cum := v_cum + v_winner.tiket;
      if v_rnd < v_cum then
        insert into public.weekly_lottery (draw_date, winner_user_id, tickets_used, reward_amount)
        values (v_draw_date, v_winner.user_id, v_winner.tiket, 100000);

        insert into public.notifications (user_id, title, message)
        values (v_winner.user_id, 'Selamat!', 'Kamu menang undian! Voucher 100.000 Rp akan dikirim.');

        v_picked := array_append(v_picked, v_winner.user_id);
        v_total := v_total - v_winner.tiket;
        exit;
      end if;
    end loop;
  end loop;

  update public.user_stats set tiket = 0, updated_at = now();
end;
$$;

-- RLS for weekly_lottery
alter table public.weekly_lottery enable row level security;

create policy "Anyone can read lottery results"
  on public.weekly_lottery for select
  to authenticated
  using (true);
