-- Storage ve Deals tablosu için RLS politikaları
-- Hem anonim hem giriş yapmış kullanıcılar: INSERT + SELECT
-- Supabase SQL Editor'da çalıştırın.

-- ========== 1. DEALS TABLOSU - PUBLIC INSERT ==========
alter table public.deals enable row level security;

drop policy if exists "Authenticated users can insert deals" on public.deals;
drop policy if exists "Authenticated and anonymous users can insert deals" on public.deals;

-- Herkes (anon + authenticated) deals tablosuna insert yapabilsin
create policy "Public insert deals"
  on public.deals for insert
  to anon, authenticated
  with check (true);

-- Herkes deals okuyabilsin
drop policy if exists "Anyone can read deals" on public.deals;
create policy "Anyone can read deals"
  on public.deals for select
  to anon, authenticated
  using (true);

-- ========== 2. RECEIPTS BUCKET ==========
-- Path: userId/... (fişler) ve deals/userId/... (kırmızı etiket)
drop policy if exists "Users can upload to deals folder" on storage.objects;
drop policy if exists "Public read deals images" on storage.objects;
drop policy if exists "Receipts bucket insert all" on storage.objects;
drop policy if exists "Receipts bucket select" on storage.objects;

-- anon + authenticated: receipts bucket'a yükleme
create policy "Receipts bucket insert all"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'receipts');

create policy "Receipts bucket select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'receipts');

-- ========== 3. PROMOS BUCKET ==========
drop policy if exists "Promos bucket insert all" on storage.objects;
drop policy if exists "Promos bucket select" on storage.objects;

create policy "Promos bucket insert all"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'promos');

create policy "Promos bucket select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'promos');

-- ========== 4. DEALS BUCKET (ayrı bucket varsa) ==========
drop policy if exists "Deals bucket insert all" on storage.objects;
drop policy if exists "Deals bucket select" on storage.objects;

create policy "Deals bucket insert all"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'deals');

create policy "Deals bucket select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'deals');
