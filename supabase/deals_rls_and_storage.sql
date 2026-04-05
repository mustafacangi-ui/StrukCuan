-- RLS ve Storage politikaları: deals tablosu + receipts bucket (deals/ klasörü)
-- Red Label yüklemeleri için. Anonim kullanıcılar dahil tüm giriş yapmış kullanıcılar ekleyebilir.
-- Supabase SQL Editor'da çalıştırın.

-- ========== 1. DEALS TABLOSU RLS ==========
-- Mevcut policy'yi güncelle: anonim kullanıcılar da insert yapabilsin (auth.uid() is not null)
drop policy if exists "Authenticated users can insert deals" on public.deals;

create policy "Authenticated and anonymous users can insert deals"
  on public.deals for insert
  with check (auth.uid() is not null);

-- Admin kullanıcılar deals tablosunu güncelleyebilir (approve/reject için)
drop policy if exists "Admin users can update deals" on public.deals;

create policy "Admin users can update deals"
  on public.deals for update
  using (
    exists (
      select 1 from public.user_stats 
      where user_id = auth.uid() 
      and is_admin = true
    )
  );

-- Okuma zaten var, kontrol et
-- create policy "Anyone can read deals" ... (deals_table.sql'de tanımlı)

-- ========== 2. RECEIPTS STORAGE BUCKET - DEALS KLASÖRÜ ==========
-- Mevcut policy sadece userId/... path'ine izin veriyor.
-- deals/userId/timestamp.jpg path'i için yeni policy ekle.

-- Önce mevcut storage policies'leri kontrol et - receipts bucket için
-- Supabase'de storage.objects tablosunda RLS var.

-- Deals klasörüne yükleme: path = deals/{auth.uid()}/...
-- storage.foldername(name) -> ["deals", "userId", "file.jpg"]
drop policy if exists "Users can upload to deals folder" on storage.objects;

create policy "Users can upload to deals folder"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'deals'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Deals klasöründen okuma (haritada görüntüleme için)
drop policy if exists "Public read deals images" on storage.objects;

create policy "Public read deals images"
  on storage.objects for select
  to public
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'deals'
  );
