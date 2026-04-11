-- Add winner_name + UUID-safe run_weekly_draw (pool keyed by lottery_tickets.id / user_id::uuid).
-- Run in Supabase SQL Editor.
-- Prereq: weekly_winners.user_id must be UUID (migrate from text if your project still uses text).

-- 1) Columns on weekly_winners
alter table public.weekly_winners
  add column if not exists winner_name text;
alter table public.weekly_winners
  add column if not exists winning_ballot_id bigint;
alter table public.weekly_winners
  add column if not exists draw_code text;
alter table public.weekly_winners
  add column if not exists week_key text;
alter table public.weekly_winners
  add column if not exists voucher_amount integer;

-- 2) run_weekly_draw (UUID pool + weekly_winners.user_id without text cast)
create or replace function public.run_weekly_draw()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draw_date    date    := (now() at time zone 'Asia/Jakarta')::date;
  v_draw_week    integer := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  v_week_key     text    := to_char((now() at time zone 'Asia/Jakarta'), 'IYYY-"W"IW');
  v_winner       record;
  v_total        bigint;
  v_rnd          bigint;
  v_offset       bigint;
  v_picked       uuid[]  := '{}';
  v_i            integer;
  v_nickname     text;
  v_display_id   integer;
  v_display_name text;
  v_winner_code  text;
begin
  v_total := (select count(*) from public.lottery_tickets);
  if v_total = 0 then
    return;
  end if;

  for v_i in 1..5 loop
    exit when v_total <= 0;

    v_rnd    := floor(random() * v_total)::bigint;
    v_offset := 0;

    for v_winner in
      select lt.id, lt.user_id::uuid as user_id
      from public.lottery_tickets lt
      order by lt.id
    loop
      if v_winner.user_id = any(v_picked) then
        continue;
      end if;

      if v_offset = v_rnd then
        select coalesce(nickname, 'User')
          into v_nickname
          from public.user_stats
         where user_id = v_winner.user_id;

        v_display_id   := abs(hashtext(v_winner.user_id::text)) % 90000 + 10000;
        v_display_name := coalesce(v_nickname, 'User') || ' #' || v_display_id::text;

        select wde.draw_code
          into v_winner_code
          from public.weekly_draw_entries wde
         where wde.user_id = v_winner.user_id
           and wde.week_key = v_week_key
         order by wde.ticket_threshold desc
         limit 1;

        if v_winner_code is null then
          v_winner_code := v_winner.id::text;
        end if;

        insert into public.weekly_winners (
          user_id,
          winner_name,
          draw_date,
          prize_amount,
          voucher_amount,
          winning_ballot_id,
          draw_code,
          week_key,
          created_at
        )
        values (
          v_winner.user_id,
          v_display_name,
          v_draw_date,
          50000,
          50000,
          v_winner.id,
          v_winner_code,
          v_week_key,
          now()
        );

        begin
          insert into public.notifications (user_id, title, message)
          values (
            v_winner.user_id,
            'Selamat! Kamu Menang! 🎉',
            'Halo ' || coalesce(v_nickname, 'User')
              || '! Kamu memenangkan voucher belanja Rp50.000 dari undian mingguan StrukCuan! '
              || 'Draw code: #' || v_winner_code
          );
        exception when others then
          raise warning 'Notification failed for winner %: %', v_winner.user_id, sqlerrm;
        end;

        v_picked := array_append(v_picked, v_winner.user_id);
        delete from public.lottery_tickets lt
         where lt.user_id::text = v_winner.user_id::text;
        v_total := (select count(*) from public.lottery_tickets);
        exit;
      end if;

      v_offset := v_offset + 1;
    end loop;

    if coalesce(array_length(v_picked, 1), 0) < v_i then
      exit;
    end if;
  end loop;

  delete from public.lottery_tickets;
  update public.user_tickets
     set tickets = 0, updated_at = now()
   where draw_week = v_draw_week;
end;
$$;

grant execute on function public.run_weekly_draw() to service_role;
