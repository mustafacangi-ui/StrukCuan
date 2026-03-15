-- Apply: tiket sütunu + grant_ticket uyumluluğu
-- Supabase SQL Editor'da çalıştırın.
--
-- 1) user_stats.tiket sütunu yoksa ekler
-- 2) user_tickets tablosu ve upsert_user_ticket yoksa oluşturur
-- 3) grant_ticket: tiket kullanır, 5/10/18 reklamda bilet verir

-- ========== 1) user_stats.tiket ==========
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_stats' and column_name = 'ticket')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket') then
    alter table public.user_stats rename column ticket to tiket;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_stats' and column_name = 'tiket') then
    alter table public.user_stats add column tiket integer not null default 0;
  end if;
end
$$;

-- ========== 2) user_tickets + upsert_user_ticket ==========
create table if not exists public.user_tickets (
  user_id text not null,
  draw_week integer not null,
  tickets integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, draw_week)
);
create index if not exists user_tickets_draw_week_idx on public.user_tickets (draw_week);
alter table public.user_tickets enable row level security;
drop policy if exists "Users can read own user_tickets" on public.user_tickets;
create policy "Users can read own user_tickets" on public.user_tickets for select to authenticated using (user_id = auth.uid()::text);

create table if not exists public.lottery_tickets (
  id bigserial primary key,
  user_id text not null,
  draw_week integer not null,
  created_at timestamptz default now()
);
create index if not exists lottery_tickets_draw_week_idx on public.lottery_tickets (draw_week);

create or replace function public.upsert_user_ticket(p_user_id text, p_draw_week integer, p_add integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_tickets (user_id, draw_week, tickets, updated_at)
  values (p_user_id, p_draw_week, least(p_add, 40), now())
  on conflict (user_id, draw_week)
  do update set tickets = least(public.user_tickets.tickets + p_add, 40), updated_at = now();
end;
$$;

-- ========== 3) grant_ticket (tiket kullanır, 5/10/18 ads) ==========
alter table public.ad_ticket_events drop constraint if exists ad_ticket_events_event_type_check;
alter table public.ad_ticket_events add constraint ad_ticket_events_event_type_check
  check (event_type in ('wednesday', 'sunday', 'monetag', 'rewarded'));

create or replace function public.grant_ticket()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  v_date_id text;
  v_count integer;
  v_draw_week integer;
  v_tickets_to_add integer := 0;
  v_today_start timestamptz;
begin
  uid := auth.uid();
  if uid is null then raise exception 'User not authenticated'; end if;

  v_today_start := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  v_date_id := to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD');
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select count(*)::integer into v_count from public.ad_ticket_events
  where user_id = uid and event_type = 'rewarded' and created_at >= v_today_start;

  if v_count >= 18 then raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001'; end if;

  insert into public.ad_ticket_events (user_id, event_type, week_id) values (uid, 'rewarded', v_date_id);

  v_count := v_count + 1;
  if v_count = 5 or v_count = 10 then v_tickets_to_add := 1;
  elsif v_count = 18 then v_tickets_to_add := 1; end if;

  if v_tickets_to_add > 0 then
    insert into public.user_stats (user_id, tiket) values (uid::text, v_tickets_to_add)
    on conflict (user_id) do update set tiket = public.user_stats.tiket + v_tickets_to_add, updated_at = now();

    if coalesce((select tickets from public.user_tickets where user_id = uid::text and draw_week = v_draw_week), 0) < 40 then
      perform public.upsert_user_ticket(uid::text, v_draw_week, v_tickets_to_add);
      insert into public.lottery_tickets (user_id, draw_week)
      select uid::text, v_draw_week from generate_series(1, v_tickets_to_add);
    end if;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.grant_ticket() to authenticated;
