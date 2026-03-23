-- =============================================================================
-- StrukCuan: FINAL FIX (v4)
-- receipts.user_id = UUID  ← ekrandan görüldü
-- user_stats.user_id = TEXT (complete_setup_fix.sql'dan)
-- daily_missions.user_id = TEXT
-- notifications.user_id = TEXT
-- create_receipt / get_receipts_today_count parametresi = UUID
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

-- 3) ESKİ FONKSİYON İMZALARINI KALDIR
drop function if exists public.create_receipt(text, text, text, integer, integer);
drop function if exists public.create_receipt(uuid, text, text, integer, integer);
drop function if exists public.get_receipts_today_count(text);
drop function if exists public.get_receipts_today_count(uuid);

-- 4) TRIGGER: günlük limit kontrolü
--    receipts.user_id = UUID → karşılaştırma direkt uuid = uuid
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

-- 5) RPC: get_receipts_today_count
--    p_user_id uuid, receipts.user_id uuid → direkt karşılaştırma
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

-- 6) RPC: create_receipt
--    p_user_id uuid → receipts.user_id uuid → direkt insert (::text KULLANMA)
--    user_stats / daily_missions / notifications trigger tarafından hallolur
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
  -- Auth kontrolü: her iki taraf UUID
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  -- Günlük limit kontrolü
  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id
    and created_at >= v_utc_day_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.';
  end if;

  -- INSERT: receipts.user_id UUID → p_user_id doğrudan (::text cast YOK)
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

-- 7) TRIGGER: ödül fonksiyonu
--    new.user_id = UUID (receipts.user_id uuid)
--    user_stats.user_id = TEXT  → v_uid_text kullan
--    daily_missions.user_id = TEXT → v_uid_text kullan
--    notifications.user_id = TEXT  → v_uid_text kullan
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
  v_uid_text       text        := new.user_id::text;
begin
  -- Bugünkü receipt sayısı
  select count(*) into v_receipts_today
  from public.receipts
  where user_id = new.user_id
    and created_at >= v_utc_day_start;

  v_grant_ticket := (v_receipts_today <= 3);

  -- user_stats (user_id TEXT)
  if v_grant_ticket then
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (v_uid_text, 1, 1, 1)
    on conflict (user_id)
    do update set
      tiket          = public.user_stats.tiket + 1,
      total_receipts = public.user_stats.total_receipts + 1,
      level          = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at     = now();
  else
    insert into public.user_stats (user_id, tiket, total_receipts, level)
    values (v_uid_text, 0, 1, 1)
    on conflict (user_id)
    do update set
      total_receipts = public.user_stats.total_receipts + 1,
      level          = public.level_from_receipts(public.user_stats.total_receipts + 1),
      updated_at     = now();
  end if;

  -- daily_missions (user_id TEXT)
  if v_receipts_today = 1 then
    insert into public.daily_missions (user_id, mission_date, completed, reward_claimed)
    values (v_uid_text, v_today, true, true)
    on conflict (user_id, mission_date)
    do update set completed = true, reward_claimed = true;

    if v_grant_ticket then
      -- Streak hesabı
      select last_upload_date into v_last_date
      from public.user_stats where user_id = v_uid_text;

      if v_last_date is null then
        v_new_streak := 1;
      elsif v_last_date = v_today then
        v_new_streak := coalesce(
          (select current_streak from public.user_stats where user_id = v_uid_text), 1
        );
      elsif v_last_date = v_today - 1 then
        v_new_streak := coalesce(
          (select current_streak from public.user_stats where user_id = v_uid_text), 0
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
      where user_id = v_uid_text;

      if v_streak_bonus > 0 then
        insert into public.notifications (user_id, title, message)
        values (
          v_uid_text,
          'Streak Bonus!',
          v_new_streak || ' hari berturut-turut! Kamu dapat +' || v_streak_bonus || ' tiket.'
        );
      end if;
    else
      update public.user_stats
      set last_upload_date = v_today, updated_at = now()
      where user_id = v_uid_text;
    end if;
  end if;

  -- notifications (user_id TEXT)
  if v_grant_ticket then
    insert into public.notifications (user_id, title, message)
    values (v_uid_text, 'Struk Diterima!', 'Kamu dapat +1 Tiket Undian. Semoga beruntung!');
  else
    insert into public.notifications (user_id, title, message)
    values (v_uid_text, 'Struk Diterima!', 'Limit tiket harian (3) tercapai. Struk tersimpan, tidak ada tiket tambahan.');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_receipt_insert_reward on public.receipts;
create trigger trg_receipt_insert_reward
  after insert on public.receipts
  for each row execute function public.on_receipt_insert_reward();
