-- Lottery ballot IDs (Defensive Casting Fixed): users see their pool ticket #s; winners store winning_ballot_id.
-- Resolves "operator does not exist: uuid = text" by using defensive ::text casts.

-- 1) Columns on weekly_winners
alter table public.weekly_winners
  add column if not exists winner_name text;
alter table public.weekly_winners
  add column if not exists winning_ballot_id bigint;

-- 2) Pool count for current Jakarta week
create or replace function public.get_lottery_pool_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint
  from public.lottery_tickets
  where draw_week = extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
$$;

grant execute on function public.get_lottery_pool_count() to authenticated;
grant execute on function public.get_lottery_pool_count() to anon;

-- 3) Current user's ballot IDs this week (Defensive casting)
create or replace function public.get_my_lottery_ballots()
returns table (id bigint)
language sql
security definer
set search_path = public
stable
as $$
  select lt.id
  from public.lottery_tickets lt
  where lt.user_id::text = auth.uid()::text
    and lt.draw_week = extract(week from (now() at time zone 'Asia/Jakarta'))::integer
  order by lt.id asc;
$$;

grant execute on function public.get_my_lottery_ballots() to authenticated;

-- 4) run_weekly_draw: persist winning lottery_tickets.id + winner_name (Defensive casting)
create or replace function public.run_weekly_draw()
returns void
language plpgsql
security definer
SET search_path = public
AS $$
DECLARE
  v_draw_date    date    := (now() at time zone 'Asia/Jakarta')::date;
  v_draw_week    integer := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  v_winner       record;
  v_total        bigint;
  v_rnd          bigint;
  v_offset       bigint;
  v_picked       text[]  := '{}'; -- Keep as text[] for interoperability
  v_i            integer;
  v_nickname     text;
  v_display_id   integer;
  v_display_name text;
BEGIN
  v_total := (select count(*) from public.lottery_tickets);
  if v_total = 0 then return; end if;

  for v_i in 1..5 loop
    exit when v_total <= 0;

    v_rnd    := floor(random() * v_total)::bigint;
    v_offset := 0;

    for v_winner in
      select lt.id, lt.user_id from public.lottery_tickets lt order by lt.id
    loop
      if v_winner.user_id::text = any(v_picked) then
        continue;
      end if;

      if v_offset = v_rnd then
        select coalesce(nickname, 'User')
          into v_nickname
          from public.user_stats
         where user_id::text = v_winner.user_id::text;

        v_display_id   := abs(hashtext(v_winner.user_id::text)) % 90000 + 10000;
        v_display_name := coalesce(v_nickname, 'User') || ' #' || v_display_id::text;

        insert into public.weekly_winners (
          user_id, winner_name, draw_date, prize_amount, winning_ballot_id, created_at
        )
        values (
          v_winner.user_id::text, v_display_name, v_draw_date, 100000, v_winner.id, now()
        );

        begin
          insert into public.notifications (user_id, title, message)
          values (
            v_winner.user_id::text,
            'Selamat! Kamu Menang! 🎉',
            'Halo ' || coalesce(v_nickname, 'User')
              || '! Kamu memenangkan voucher belanja Rp100.000 dari undian mingguan StrukCuan! '
              || 'Nomor bilet undian: #' || v_winner.id::text
          );
        exception when others then
          raise warning 'Notification failed for winner %: %', v_winner.user_id, sqlerrm;
        end;

        v_picked := array_append(v_picked, v_winner.user_id::text);
        delete from public.lottery_tickets where user_id::text = v_winner.user_id::text;
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

-- 5) RLS (Defensive casting)
drop policy if exists "Users can read lottery_tickets" on public.lottery_tickets;
drop policy if exists "Lottery tickets select" on public.lottery_tickets;
drop policy if exists "Users read own lottery ballots" on public.lottery_tickets;

create policy "Users read own lottery ballots"
  on public.lottery_tickets for select
  to authenticated
  using (user_id::text = auth.uid()::text);
