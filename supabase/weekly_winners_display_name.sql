-- Add winner_name to weekly_winners + update run_weekly_draw to save display name & ID
-- Display ID: deterministic 5-digit number from user_id hash (10000–99999)
-- Format stored: "Mustafa #58964"
-- Run in Supabase SQL Editor.

-- 1) Add winner_name column to weekly_winners
alter table public.weekly_winners
  add column if not exists winner_name text;

-- 2) Updated run_weekly_draw: saves winner_name = "Nickname #DDDDD"
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
  v_nickname    text;
  v_display_id  integer;
  v_display_name text;
begin
  v_total := (select count(*) from public.lottery_tickets);
  if v_total = 0 then return; end if;

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
        -- Look up nickname from user_stats (user_stats.user_id = UUID)
        select coalesce(nickname, 'User')
          into v_nickname
          from public.user_stats
         where user_id = v_winner.user_id::uuid;

        -- Deterministic 5-digit display ID from user_id hash
        v_display_id   := abs(hashtext(v_winner.user_id)) % 90000 + 10000;
        v_display_name := coalesce(v_nickname, 'User') || ' #' || v_display_id::text;

        -- Insert winner with display name
        insert into public.weekly_winners (user_id, winner_name, draw_date, prize_amount, created_at)
        values (v_winner.user_id, v_display_name, v_draw_date, 100000, now());

        -- Notify winner (notifications.user_id = UUID → cast)
        begin
          insert into public.notifications (user_id, title, message)
          values (
            v_winner.user_id::uuid,
            'Selamat! Kamu Menang! 🎉',
            'Halo ' || coalesce(v_nickname, 'User') || '! Kamu memenangkan voucher belanja Rp100.000 dari undian mingguan StrukCuan! ID pemenang: #' || v_display_id::text
          );
        exception when others then
          raise warning 'Notification failed for winner %: %', v_winner.user_id, sqlerrm;
        end;

        v_picked := array_append(v_picked, v_winner.user_id);
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

  delete from public.lottery_tickets;
  update public.user_tickets set tickets = 0, updated_at = now()
   where draw_week = v_draw_week;
end;
$$;

grant execute on function public.run_weekly_draw() to service_role;
