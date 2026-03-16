-- deals tablosuna user_id ekle (paylaşılan indirim sayısı için)
-- Supabase SQL Editor'da çalıştırın.

alter table public.deals add column if not exists user_id text;
