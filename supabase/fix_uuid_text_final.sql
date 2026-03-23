-- =============================================================================
-- StrukCuan: FINAL FIX (v5)
-- Tüm user_id kolonlarını UUID'ye normalize eder, sonra fonksiyonları yazar.
-- receipts.user_id = UUID (ekrandan onaylandı)
-- Bu script: user_stats, daily_missions, notifications user_id → UUID'ye çevirir
-- =============================================================================

-- 1) KOLON ADI DÜZELTMESİ: "image" → "image_url"
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'receipts' and column_name = 'image'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'receipts' and column_name = 'image_url'
  ) then
    alter table public.receipts rename column image to image_url;
    raise notice 'receipts.image renamed to image_url';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'receipts' and column_name = 'image_url'
  ) then
    alter table public.receipts add column image_url text;
    raise notice 'receipts.image_url added';
  end if;
end;
$$;

-- 2) EKSİK KOLONLARI EKLE (idempotent)
alter table public.receipts add column if not exists store               text;
alter table public.receipts add column if not exists total               numeric;
alter table public.receipts add column if not exists receipt_index_today integer;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'receipts' and column_name = 'status'
  ) then
    alter table public.receipts add column status text not null default 'pending';
    raise notice 'receipts.status added';
  end if;
end;
$$;

-- 3) TÜM user_id KOLONLARINI UUID'YE NORMALIZE ET
-- receipts.user_id zaten UUID. Diğerlerini de UUID'ye çevir.

-- user_stats.user_id → uuid
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='user_stats' and column_name='user_id') = 'text' then
    -- FK varsa kaldır
    alter table public.user_stats drop constraint if exists user_stats_pkey;
    alter table public.user_stats alter column user_id type uuid using user_id::uuid;
    alter table public.user_stats add primary key (user_id);
    raise notice 'user_stats.user_id: text → uuid';
  else
    raise notice 'user_stats.user_id zaten uuid';
  end if;
exception when others then
  raise notice 'user_stats.user_id dönüşüm atlandı: %', sqlerrm;
end;
$$;

-- daily_missions.user_id → uuid
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='daily_missions' and column_name='user_id') = 'text' then
    alter table public.daily_missions drop constraint if exists daily_missions_pkey;
    alter table public.daily_missions drop constraint if exists daily_missions_user_id_mission_date_key;
    alter table public.daily_missions alter column user_id type uuid using user_id::uuid;
    -- PK'yi geri ekle (user_id + mission_date)
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema='public' and table_name='daily_missions' and constraint_type='PRIMARY KEY'
    ) then
      alter table public.daily_missions add primary key (user_id, mission_date);
    end if;
    raise notice 'daily_missions.user_id: text → uuid';
  else
    raise notice 'daily_missions.user_id zaten uuid';
  end if;
exception when others then
  raise notice 'daily_missions.user_id dönüşüm atlandı: %', sqlerrm;
end;
$$;

-- notifications.user_id → uuid
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema='public' and table_name='notifications' and column_name='user_id') = 'text' then
    alter table public.notifications alter column user_id type uuid using user_id::uuid;
    raise notice 'notifications.user_id: text → uuid';
  else
    raise notice 'notifications.user_id zaten uuid';
  end if;
exception when others then
  raise notice 'notifications.user_id dönüşüm atlandı: %', sqlerrm;
end;
$$;

-- 4) ESKİ FONKSİYON İMZALARINI KALDIR
drop function if exists public.create_receipt(text, text, text, integer, integer);
drop function if exists public.create_receipt(uuid, text, text, integer, integer);
drop function if exists public.get_receipts_today_count(text);
drop function if exists public.get_receipts_today_count(uuid);

-- 5) TRIGGER: günlük limit kontrolü
create or replace function public.check_receipt_daily_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where user_id = new.user_id
    and created_at >= v_utc_day_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_receipt_daily_limit on public.receipts;
create trigger trg_check_receipt_daily_limit
  before insert on public.receipts
  for each row execute function public.check_receipt_daily_limit();

-- 6) RPC: get_receipts_today_count (her şey UUID)
create or replace function public.get_receipts_today_count(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id
    and created_at >= v_utc_day_start;
  return coalesce(v_count, 0);
end;
$$;

-- 7) RPC: create_receipt (her şey UUID, hiç ::text cast yok)
create or replace function public.create_receipt(
  p_user_id             uuid,
  p_image_url           text,
  p_store               text    default null,
  p_total               integer default null,
  p_receipt_index_today integer default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count         integer;
  v_new_id        bigint;
  v_remaining     integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id
    and created_at >= v_utc_day_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.';
  end if;

  insert into public.receipts
    (user_id, image_url, store, total, status, receipt_index_today)
  values
    (p_user_id, p_image_url, p_store, p_total, 'pending', p_receipt_index_today)
  returning id into v_new_id;

  v_remaining := 3 - (v_count + 1);

  return jsonb_build_object('id', v_new_id, 'remaining', v_remaining);
end;
$$;

grant execute on function public.create_receipt(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.get_receipts_today_count(uuid) to authenticated;

-- 8) TRIGGER: ödül fonksiyonu (her şey UUID artık)
create or replace function public.on_receipt_insert_reward()
returns trigger
language plpgsql
security definer
as $$
declare
  v_utc_day_start  timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_today          date        := (now() at time zone 'UTC')::date;
  v_receipts_today integer;
  v_last_date      date;
  v_new_streak     integer;
  v_streak_bonus   integer     := 0;
  v_grant_ticket   boolean     := false;
begin
  select count(*) into v_receipts_today
  from public.receipts
  where user_id = new.user_id
    and created_at >= v_utc_day_start;

  v_grant_ticket := (v_receipts_today <= 3);

  -- user_stats (user_id UUID)
  if v_grant_ticket then
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (new.user_id, 1, 1, 1)
    on conflict (user_id)
    do update set
      tiket          = public.user_stats.tiket + 1,
      total_receipts = public.user_stats.total_receipts + 1,
      level          = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at     = now();
  else
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (new.user_id, 0, 1, 1)
    on conflict (user_id)
    do update set
      total_receipts = public.user_stats.total_receipts + 1,
      level          = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at     = now();
  end if;

  -- daily_missions (user_id UUID)
  if v_receipts_today = 1 then
    insert into public.daily_missions (user_id, mission_date, completed, reward_claimed)
    values (new.user_id, v_today, true, true)
    on conflict (user_id, mission_date)
    do update set completed = true, reward_claimed = true;

    if v_grant_ticket then
      select last_upload_date into v_last_date
      from public.user_stats where user_id = new.user_id;

      if v_last_date is null then
        v_new_streak := 1;
      elsif v_last_date = v_today then
        v_new_streak := coalesce(
          (select current_streak from public.user_stats where user_id = new.user_id), 1
        );
      elsif v_last_date = v_today - 1 then
        v_new_streak := coalesce(
          (select current_streak from public.user_stats where user_id = new.user_id), 0
        ) + 1;
      else
        v_new_streak := 1;
      end if;

      if    v_new_streak =  3 then v_streak_bonus := 1;
      elsif v_new_streak =  7 then v_streak_bonus := 2;
      elsif v_new_streak = 14 then v_streak_bonus := 3;
      end if;

      update public.user_stats
      set current_streak   = v_new_streak,
          last_upload_date = v_today,
          tiket            = tiket + v_streak_bonus,
          updated_at       = now()
      where user_id = new.user_id;

      if v_streak_bonus > 0 then
        insert into public.notifications (user_id, title, message)
        values (
          new.user_id,
          'Streak Bonus!',
          v_new_streak || ' hari berturut-turut! Kamu dapat +' || v_streak_bonus || ' tiket.'
        );
      end if;
    else
      update public.user_stats
      set last_upload_date = v_today, updated_at = now()
      where user_id = new.user_id;
    end if;
  end if;

  -- notifications (user_id UUID)
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

-- 9) RLS POLİTİKALARI (user_id UUID ise auth.uid() ile direkt karşılaştır)
alter table public.receipts enable row level security;
drop policy if exists "Users insert own receipts" on public.receipts;
drop policy if exists "Users select own receipts" on public.receipts;

create policy "Users insert own receipts"
  on public.receipts for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users select own receipts"
  on public.receipts for select to authenticated
  using (user_id = auth.uid());

alter table public.user_stats enable row level security;
drop policy if exists "Users can read own user_stats" on public.user_stats;
drop policy if exists "User stats select" on public.user_stats;
create policy "User stats select"
  on public.user_stats for select to anon, authenticated using (true);
