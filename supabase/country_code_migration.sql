-- =============================================================================
-- country_code (ISO 3166-1 alpha-2) Migration
-- Kullanıcılar, fişler ve ödüller bu koda göre filtrelenecek.
-- Supabase SQL Editor'da çalıştırın.
-- =============================================================================

-- 1) USER_STATS - kullanıcı ülke kodu
alter table public.user_stats
  add column if not exists country_code char(2) not null default 'ID';

alter table public.user_stats
  drop constraint if exists user_stats_country_code_check;

alter table public.user_stats
  add constraint user_stats_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

create index if not exists user_stats_country_code_idx on public.user_stats (country_code);

comment on column public.user_stats.country_code is 'ISO 3166-1 alpha-2 (e.g. ID, TR)';

-- 2) RECEIPTS - fiş ülke kodu (kullanıcının ülkesiyle eşleşir)
alter table public.receipts
  add column if not exists country_code char(2) not null default 'ID';

alter table public.receipts
  drop constraint if exists receipts_country_code_check;

alter table public.receipts
  add constraint receipts_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

create index if not exists receipts_country_code_idx on public.receipts (country_code);

comment on column public.receipts.country_code is 'ISO 3166-1 alpha-2 - filters receipts by country';

-- 3) WEEKLY_LOTTERY - ödül ülke kodu
alter table public.weekly_lottery
  add column if not exists country_code char(2) not null default 'ID';

alter table public.weekly_lottery
  drop constraint if exists weekly_lottery_country_code_check;

alter table public.weekly_lottery
  add constraint weekly_lottery_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

create index if not exists weekly_lottery_country_code_idx on public.weekly_lottery (country_code);

-- 4) WEEKLY_WINNERS - ödül ülke kodu
alter table public.weekly_winners
  add column if not exists country_code char(2) not null default 'ID';

alter table public.weekly_winners
  drop constraint if exists weekly_winners_country_code_check;

alter table public.weekly_winners
  add constraint weekly_winners_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

create index if not exists weekly_winners_country_code_idx on public.weekly_winners (country_code);

-- 5) DEALS - kampanya ülke kodu (isteğe bağlı filtreleme)
alter table public.deals
  add column if not exists country_code char(2) not null default 'ID';

alter table public.deals
  drop constraint if exists deals_country_code_check;

alter table public.deals
  add constraint deals_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

create index if not exists deals_country_code_idx on public.deals (country_code);

-- 6) TRIGGER: Receipt insert'te country_code'u user_stats'tan al
create or replace function public.set_receipt_country_from_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_country char(2);
begin
  select coalesce(country_code, 'ID') into v_country
  from public.user_stats
  where user_id::text = new.user_id
  limit 1;
  new.country_code := coalesce(v_country, 'ID');
  return new;
end;
$$;

drop trigger if exists trg_receipt_set_country on public.receipts;
create trigger trg_receipt_set_country
  before insert on public.receipts
  for each row execute function public.set_receipt_country_from_user();

-- 7) user_stats.user_id text ise trigger'da ::text kullanıldı. uuid ise:
--    where user_id = new.user_id::uuid  (receipts.user_id text)
-- Mevcut schema'da receipts.user_id text, user_stats.user_id uuid veya text olabilir.
-- Yukarıdaki trigger user_id::text = new.user_id ile her iki durumda çalışır.
