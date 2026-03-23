-- =============================================================================
-- STRUKCUAN — GÜVENLİK SERTLEŞTİRME MİGRASYONU
-- Öncelik sırasına göre: Storage RLS → Hash duplikasyon → Hesap silme → Fraud flag
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 ÖNCELİK 1: STORAGE BUCKET — receipts bucket'ını private yap + RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Storage RLS'i etkinleştir (Supabase Dashboard'da "receipts" bucket'ı zaten varsa)
-- Dashboard → Storage → receipts → Public: OFF yapmanız gerekiyor (UI üzerinden)

-- Mevcut açık politikaları temizle
drop policy if exists "Public read receipts"      on storage.objects;
drop policy if exists "Public access receipts"    on storage.objects;
drop policy if exists "Anyone can view receipts"  on storage.objects;
drop policy if exists "Authenticated upload"      on storage.objects;

-- Sadece kendi klasörüne yükleyebilsin (user_id/ ön eki zorunlu)
create policy "Users upload own receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sadece kendi fişlerini görebilsin
create policy "Users view own receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin her şeyi görebilsin
create policy "Admin view all receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.user_stats
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Deals klasörü için ayrı politika (deals/ ön eki ile yükleniyor)
create policy "Users upload own deals"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'deals'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 ÖNCELİK 2: DUPLICATE FİŞ ÖNLEMESİ — image_hash server-side kontrolü
-- ─────────────────────────────────────────────────────────────────────────────

-- receipts tablosuna hash kolonu ekle
alter table public.receipts add column if not exists image_hash text;

-- Aynı hash'in iki kez yüklenmesini engelle (global — tüm kullanıcılar arasında)
create unique index if not exists receipts_image_hash_unique
  on public.receipts (image_hash)
  where image_hash is not null;

-- create_receipt fonksiyonunu güncelle — hash parametresi + duplicate kontrolü ekle
-- Eski imzayı önce kaldır
drop function if exists public.create_receipt(uuid, text, text, integer, integer);

create or replace function public.create_receipt(
  p_user_id             uuid,
  p_image_url           text,
  p_store               text    default null,
  p_total               integer default null,
  p_receipt_index_today integer default null,
  p_image_hash          text    default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_start     timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count     integer;
  v_new_id    uuid;
  v_remaining integer;
begin
  -- Yetki kontrolü
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  -- Kullanıcı işaretliyse reddet
  if exists (
    select 1 from public.user_stats
    where user_id = p_user_id and is_flagged = true
  ) then
    raise exception 'Your account has been flagged for review. Contact support.';
  end if;

  -- Server-side duplicate hash kontrolü
  if p_image_hash is not null then
    if exists (
      select 1 from public.receipts where image_hash = p_image_hash
    ) then
      raise exception 'DUPLICATE_RECEIPT: This receipt has already been uploaded.';
    end if;
  end if;

  -- Günlük limit kontrolü
  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id and created_at >= v_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.';
  end if;

  -- Kaydet
  insert into public.receipts (user_id, image_url, store, total, status, receipt_index_today, image_hash)
  values (p_user_id, p_image_url, p_store, p_total, 'pending', p_receipt_index_today, p_image_hash)
  returning id into v_new_id;

  v_remaining := 3 - (v_count + 1);
  return jsonb_build_object('id', v_new_id, 'remaining', v_remaining);
end;
$$;

grant execute on function public.create_receipt(uuid, text, text, integer, integer, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🟠 ÖNCELİK 3: GDPR/UU PDP — Hesap Silme RPC
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Kullanıcıya ait tüm verileri sil (cascade ile çoğu otomatik silinir)
  delete from public.notifications   where user_id = v_uid;
  delete from public.daily_missions  where user_id = v_uid;
  delete from public.user_stats      where user_id = v_uid;
  delete from public.receipts        where user_id = v_uid;

  -- Auth kullanıcısını sil (tüm session'ları da sonlandırır)
  delete from auth.users where id = v_uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🟠 ÖNCELİK 4: FRAUD FLAG — Şüpheli kullanıcı işaretleme
-- ─────────────────────────────────────────────────────────────────────────────

-- user_stats'a flag kolonları ekle (fix_uuid_text_final.sql'de is_admin zaten eklendi)
alter table public.user_stats add column if not exists is_flagged      boolean not null default false;
alter table public.user_stats add column if not exists flagged_reason  text;
alter table public.user_stats add column if not exists flagged_at      timestamptz;

-- Admin için: kullanıcı işaretle
create or replace function public.flag_user(
  p_target_user_id uuid,
  p_reason         text
)
returns void language plpgsql security definer as $$
begin
  -- Sadece admin çağırabilir
  if not exists (
    select 1 from public.user_stats
    where user_id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorized';
  end if;

  update public.user_stats
  set is_flagged = true,
      flagged_reason = p_reason,
      flagged_at = now()
  where user_id = p_target_user_id;
end;
$$;

-- Admin için: kullanıcı işareti kaldır
create or replace function public.unflag_user(p_target_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.user_stats
    where user_id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorized';
  end if;

  update public.user_stats
  set is_flagged = false, flagged_reason = null, flagged_at = null
  where user_id = p_target_user_id;
end;
$$;

grant execute on function public.flag_user(uuid, text) to authenticated;
grant execute on function public.unflag_user(uuid)     to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🟠 ÖNCELİK 5: RATE LIMIT TABLOSU
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.rpc_rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  rpc_name     text        not null,
  window_start timestamptz not null default date_trunc('minute', now()),
  call_count   integer     not null default 1,
  primary key (user_id, rpc_name, window_start)
);

-- Eski kayıtları otomatik temizle (7 günden eski)
create index if not exists rpc_rate_limits_window_idx on public.rpc_rate_limits (window_start);

-- Rate limit RLS — sadece kendi kayıtları
alter table public.rpc_rate_limits enable row level security;
create policy "Rate limit own records"
  on public.rpc_rate_limits for all to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 🟢 YARDIMCI: Eski rate limit kayıtlarını temizleme fonksiyonu
-- (Supabase cron job ile her gece çalıştırın: SELECT clean_rate_limits();)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.clean_rate_limits()
returns void language sql security definer as $$
  delete from public.rpc_rate_limits where window_start < now() - interval '7 days';
$$;
