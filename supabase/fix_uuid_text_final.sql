-- =============================================================================
-- StrukCuan: FINAL FIX (v6) — Tamamen bağımsız, sıfırdan çalışır
-- Çalıştırma sırası: Bu tek dosyayı SQL Editor'a yapıştır → Run
-- receipts.user_id = UUID (onaylandı)
-- Tüm user_id kolonları UUID olarak normalize edilir
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 0: YARDIMCI FONKSİYON
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.level_from_receipts(p_total integer)
returns integer language plpgsql immutable as $$
begin
  if    p_total >= 60 then return 5;
  elsif p_total >= 30 then return 4;
  elsif p_total >= 15 then return 3;
  elsif p_total >= 5  then return 2;
  else return 1;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 1: TABLOLARI OLUŞTUR (yoksa) + EKSİK KOLONLARI EKLE
-- ─────────────────────────────────────────────────────────────────────────────

-- user_stats
create table if not exists public.user_stats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  cuan           integer   not null default 0,
  tiket          integer   not null default 0,
  total_receipts integer   not null default 0,
  level          integer   not null default 1,
  current_streak integer   not null default 0,
  last_upload_date date,
  nickname       text,
  referral_code  text,
  country_code   text,
  is_admin       boolean   not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.user_stats add column if not exists cuan            integer   not null default 0;
alter table public.user_stats add column if not exists tiket           integer   not null default 0;
alter table public.user_stats add column if not exists total_receipts  integer   not null default 0;
alter table public.user_stats add column if not exists level           integer   not null default 1;
alter table public.user_stats add column if not exists current_streak  integer   not null default 0;
alter table public.user_stats add column if not exists last_upload_date date;
alter table public.user_stats add column if not exists nickname        text;
alter table public.user_stats add column if not exists country_code    text;
alter table public.user_stats add column if not exists is_admin        boolean   not null default false;
alter table public.user_stats add column if not exists updated_at      timestamptz default now();

-- user_stats.user_id TEXT ise UUID'ye çevir
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='user_stats' and column_name='user_id') = 'text' then
    alter table public.user_stats drop constraint if exists user_stats_pkey;
    alter table public.user_stats alter column user_id type uuid using user_id::uuid;
    alter table public.user_stats add primary key (user_id);
    raise notice 'user_stats.user_id: text → uuid';
  end if;
exception when others then
  raise notice 'user_stats.user_id dönüşüm atlandı: %', sqlerrm;
end;
$$;

-- daily_missions
create table if not exists public.daily_missions (
  user_id        uuid    not null references auth.users(id) on delete cascade,
  mission_date   date    not null,
  completed      boolean not null default false,
  reward_claimed boolean not null default false,
  primary key (user_id, mission_date)
);

-- daily_missions.user_id TEXT ise UUID'ye çevir
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='daily_missions' and column_name='user_id') = 'text' then
    alter table public.daily_missions drop constraint if exists daily_missions_pkey;
    alter table public.daily_missions alter column user_id type uuid using user_id::uuid;
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema='public' and table_name='daily_missions' and constraint_type='PRIMARY KEY'
    ) then
      alter table public.daily_missions add primary key (user_id, mission_date);
    end if;
    raise notice 'daily_missions.user_id: text → uuid';
  end if;
exception when others then
  raise notice 'daily_missions.user_id dönüşüm atlandı: %', sqlerrm;
end;
$$;

-- notifications
create table if not exists public.notifications (
  id         bigserial primary key,
  user_id    uuid        not null,
  title      text        not null,
  message    text        not null,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- notifications.user_id TEXT ise UUID'ye çevir
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='notifications' and column_name='user_id') = 'text' then
    alter table public.notifications alter column user_id type uuid using user_id::uuid;
    raise notice 'notifications.user_id: text → uuid';
  end if;
exception when others then
  raise notice 'notifications.user_id dönüşüm atlandı: %', sqlerrm;
end;
$$;

-- receipts: eksik kolonları ekle
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='receipts' and column_name='image'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='receipts' and column_name='image_url'
  ) then
    alter table public.receipts rename column image to image_url;
  end if;
end;
$$;
alter table public.receipts add column if not exists image_url           text;
alter table public.receipts add column if not exists store               text;
alter table public.receipts add column if not exists total               numeric;
alter table public.receipts add column if not exists receipt_index_today integer;
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='receipts' and column_name='status'
  ) then
    alter table public.receipts add column status text not null default 'pending';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 2: ESKİ FONKSİYON İMZALARINI TEMİZLE
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.create_receipt(text, text, text, integer, integer);
drop function if exists public.create_receipt(uuid, text, text, integer, integer);
drop function if exists public.get_receipts_today_count(text);
drop function if exists public.get_receipts_today_count(uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 3: TRIGGER — günlük limit kontrolü (BEFORE INSERT)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_receipt_daily_limit()
returns trigger language plpgsql security definer as $$
declare
  v_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where user_id = new.user_id and created_at >= v_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_receipt_daily_limit on public.receipts;
create trigger trg_check_receipt_daily_limit
  before insert on public.receipts
  for each row execute function public.check_receipt_daily_limit();

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 4: RPC — get_receipts_today_count
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_receipts_today_count(p_user_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id and created_at >= v_start;
  return coalesce(v_count, 0);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 5: RPC — create_receipt
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.create_receipt(
  p_user_id             uuid,
  p_image_url           text,
  p_store               text    default null,
  p_total               integer default null,
  p_receipt_index_today integer default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_start     timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count     integer;
  v_new_id    uuid;
  v_remaining integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id and created_at >= v_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.';
  end if;

  insert into public.receipts (user_id, image_url, store, total, status, receipt_index_today)
  values (p_user_id, p_image_url, p_store, p_total, 'pending', p_receipt_index_today)
  returning id into v_new_id;

  v_remaining := 3 - (v_count + 1);
  return jsonb_build_object('id', v_new_id, 'remaining', v_remaining);
end;
$$;

grant execute on function public.create_receipt(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.get_receipts_today_count(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 6: TRIGGER — ödül fonksiyonu (AFTER INSERT)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.on_receipt_insert_reward()
returns trigger language plpgsql security definer as $$
declare
  v_start          timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_today          date        := (now() at time zone 'UTC')::date;
  v_receipts_today integer;
  v_last_date      date;
  v_new_streak     integer;
  v_streak_bonus   integer  := 0;
  v_grant_ticket   boolean  := false;
begin
  select count(*) into v_receipts_today
  from public.receipts
  where user_id = new.user_id and created_at >= v_start;

  v_grant_ticket := (v_receipts_today <= 3);

  -- user_stats (UUID)
  if v_grant_ticket then
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (new.user_id, 1, 1, 1)
    on conflict (user_id) do update set
      tiket          = public.user_stats.tiket + 1,
      total_receipts = public.user_stats.total_receipts + 1,
      level          = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at     = now();
  else
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (new.user_id, 0, 1, 1)
    on conflict (user_id) do update set
      total_receipts = public.user_stats.total_receipts + 1,
      level          = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at     = now();
  end if;

  -- daily_missions (UUID) — sadece günün ilk receipti
  if v_receipts_today = 1 then
    insert into public.daily_missions (user_id, mission_date, completed, reward_claimed)
    values (new.user_id, v_today, true, true)
    on conflict (user_id, mission_date) do update set completed = true, reward_claimed = true;

    if v_grant_ticket then
      select last_upload_date into v_last_date
      from public.user_stats where user_id = new.user_id;

      if    v_last_date is null         then v_new_streak := 1;
      elsif v_last_date = v_today       then v_new_streak := coalesce((select current_streak from public.user_stats where user_id = new.user_id), 1);
      elsif v_last_date = v_today - 1   then v_new_streak := coalesce((select current_streak from public.user_stats where user_id = new.user_id), 0) + 1;
      else                                   v_new_streak := 1;
      end if;

      if    v_new_streak =  3 then v_streak_bonus := 1;
      elsif v_new_streak =  7 then v_streak_bonus := 2;
      elsif v_new_streak = 14 then v_streak_bonus := 3;
      end if;

      update public.user_stats
      set current_streak = v_new_streak, last_upload_date = v_today,
          tiket = tiket + v_streak_bonus, updated_at = now()
      where user_id = new.user_id;

      if v_streak_bonus > 0 then
        insert into public.notifications (user_id, title, message)
        values (new.user_id, 'Streak Bonus!',
          v_new_streak || ' hari berturut-turut! Kamu dapat +' || v_streak_bonus || ' tiket.');
      end if;
    else
      update public.user_stats
      set last_upload_date = v_today, updated_at = now()
      where user_id = new.user_id;
    end if;
  end if;

  -- notifications (UUID)
  if v_grant_ticket then
    insert into public.notifications (user_id, title, message)
    values (new.user_id, 'Struk Diterima!', 'Kamu dapat +1 Tiket Undian. Semoga beruntung!');
  else
    insert into public.notifications (user_id, title, message)
    values (new.user_id, 'Struk Diterima!', 'Limit tiket harian (3) tercapai. Struk tersimpan, tidak ada tiket tambahan.');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_receipt_insert_reward on public.receipts;
create trigger trg_receipt_insert_reward
  after insert on public.receipts
  for each row execute function public.on_receipt_insert_reward();

-- ─────────────────────────────────────────────────────────────────────────────
-- ADIM 7: RLS POLİTİKALARI
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.receipts      enable row level security;
alter table public.user_stats    enable row level security;
alter table public.daily_missions enable row level security;
alter table public.notifications  enable row level security;

drop policy if exists "Users insert own receipts" on public.receipts;
drop policy if exists "Users select own receipts" on public.receipts;
create policy "Users insert own receipts"
  on public.receipts for insert to authenticated with check (user_id = auth.uid());
create policy "Users select own receipts"
  on public.receipts for select to authenticated using (user_id = auth.uid());

drop policy if exists "User stats select" on public.user_stats;
drop policy if exists "Users can read own user_stats" on public.user_stats;
-- authenticated users can read all stats (needed for leaderboard); anon cannot
create policy "User stats select"
  on public.user_stats for select to authenticated using (true);

drop policy if exists "Daily missions own" on public.daily_missions;
create policy "Daily missions own"
  on public.daily_missions for all to authenticated using (user_id = auth.uid());

drop policy if exists "Notifications own" on public.notifications;
create policy "Notifications own"
  on public.notifications for select to authenticated using (user_id = auth.uid());
