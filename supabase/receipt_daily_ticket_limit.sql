-- Server-side enforcement: only first 3 receipts per day earn tickets
-- Run in Supabase SQL Editor after lottery_migration.sql
-- Prevents bypass via API, double-submit, or stale client data

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
  v_grant_ticket boolean := false;
begin
  -- Count receipts today FIRST (includes this new row) for server-side limit
  select count(*) into v_receipts_today
  from public.receipts
  where user_id = new.user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

  v_grant_ticket := (v_receipts_today <= 3);

  if v_grant_ticket then
    -- Within limit: grant +1 ticket
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (new.user_id, 1, 1, 1)
    on conflict (user_id)
    do update set
      tiket = public.user_stats.tiket + 1,
      total_receipts = public.user_stats.total_receipts + 1,
      level = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at = now();
  else
    -- Over limit: receipt stored but NO ticket
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (new.user_id, 0, 1, 1)
    on conflict (user_id)
    do update set
      total_receipts = public.user_stats.total_receipts + 1,
      level = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at = now();
  end if;

  -- Daily mission: first receipt of day = mark complete
  if v_receipts_today = 1 then
    insert into public.daily_missions (user_id, mission_date, completed, reward_claimed)
    values (new.user_id, v_today, true, true)
    on conflict (user_id, mission_date)
    do update set completed = true, reward_claimed = true;

    -- Streak logic: ticket bonuses for milestones (only when within receipt limit)
    if v_grant_ticket then
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
    else
      update public.user_stats
      set last_upload_date = v_today, updated_at = now()
      where user_id = new.user_id;
    end if;
  end if;

  -- Notification
  if v_grant_ticket then
    insert into public.notifications (user_id, title, message)
    values (
      new.user_id,
      'Struk Diterima!',
      'Kamu dapat +1 Tiket Undian. Semoga beruntung!'
    );
  else
    insert into public.notifications (user_id, title, message)
    values (
      new.user_id,
      'Struk Diterima!',
      'Limit tiket harian (3) tercapai. Struk tersimpan, tidak ada tiket tambahan.'
    );
  end if;

  return new;
end;
$$;
