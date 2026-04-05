-- Supabase SQL Editor'da çalıştırınız.
-- Replace user ID logic completed. This script sets 'ac549ad1-a341-4fc2-8d46-12787056a528' as an admin.

DO $$
DECLARE
  v_admin_id uuid := 'ac549ad1-a341-4fc2-8d46-12787056a528';
BEGIN
  -- 1) user_stats tablosundaki is_admin değerini true yapalım
  update public.user_stats
  set is_admin = true
  where user_id::text = v_admin_id::text;
  
  -- Eğer user_stats'ta bu kullanıcı yoksa, ekleyelim.
  IF NOT FOUND THEN
    insert into public.user_stats (user_id, is_admin, total_receipts, level, cuan, tiket)
    values (v_admin_id::text, true, 0, 1, 0, 0);
  END IF;

  -- 2) auth.users tablosundaki raw_app_meta_data altına {"is_admin": true} ekleyelim
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
  where id = v_admin_id;

END;
$$ LANGUAGE plpgsql;
