-- Fix run_weekly_draw: notifications.user_id is UUID (after fix_uuid_text_final.sql)
-- lottery_tickets.user_id is TEXT → cast to uuid when inserting notification
-- Run in Supabase SQL Editor.

create or replace function public.run_weekly_draw()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draw_date   date    := (now() at time zone 'Asia/Jakarta')::date;
  v_draw_week   integer := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  v_winner      record;
  v_total       bigint;
  v_rnd         bigint;
  v_offset      bigint;
  v_picked      text[]  := '{}';
  v_i           integer;
begin
  -- Step 1: Count tickets in pool
  v_total := (select count(*) from public.lottery_tickets);
  if v_total = 0 then
    return;
  end if;

  -- Step 2-3: Pick 5 unique winners (weighted by ticket count)
  for v_i in 1..5 loop
    exit when v_total <= 0;

    v_rnd    := floor(random() * v_total)::bigint;
    v_offset := 0;

    for v_winner in
      select user_id from public.lottery_tickets order by id
    loop
      if v_winner.user_id = any(v_picked) then
        continue;
      end if;
      if v_offset = v_rnd then
        -- Insert winner (user_id TEXT stored in weekly_winners)
        insert into public.weekly_winners (user_id, draw_date, prize_amount, created_at)
        values (v_winner.user_id, v_draw_date, 100000, now());

        -- Notify winner: notifications.user_id is UUID → cast TEXT to UUID
        begin
          insert into public.notifications (user_id, title, message)
          values (
            v_winner.user_id::uuid,
            'Selamat! Kamu Menang! 🎉',
            'Kamu memenangkan voucher belanja Rp100.000 dari undian mingguan StrukCuan!'
          );
        exception when others then
          raise warning 'Notification failed for winner %: %', v_winner.user_id, sqlerrm;
        end;

        v_picked := array_append(v_picked, v_winner.user_id);

        -- Remove winner's tickets from pool
        delete from public.lottery_tickets where user_id = v_winner.user_id;
        v_total := (select count(*) from public.lottery_tickets);
        exit;
      end if;
      v_offset := v_offset + 1;
    end loop;

    if coalesce(array_length(v_picked, 1), 0) < v_i then
      exit;
    end if;
  end loop;

  -- Step 4: Clear remaining tickets
  delete from public.lottery_tickets;

  -- Step 5: Reset weekly counters
  update public.user_tickets set tickets = 0, updated_at = now()
  where draw_week = v_draw_week;
end;
$$;

grant execute on function public.run_weekly_draw() to service_role;
