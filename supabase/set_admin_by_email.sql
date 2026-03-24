-- Admin yapmak: kendi e-postanızı kullanın (placeholder bırakmayın).
-- Supabase SQL Editor'da çalıştırın.
-- Tam kurulum için: önce admin_receipts_deals_fix.sql, isteğe bağlı bootstrap_admin_complete.sql
-- (o dosya hem user_stats hem auth app_metadata yazar).

-- user_stats.user_id = uuid ise:
update public.user_stats u
set is_admin = true
from auth.users a
where a.id = u.user_id
  and lower(a.email) = lower('your-email@example.com');  -- ← DEĞİŞTİR

-- 0 satır etkilendiyse user_stats yoktur:
insert into public.user_stats (user_id, is_admin)
select id, true
from auth.users
where lower(email) = lower('your-email@example.com')  -- ← DEĞİŞTİR (aynı e-posta)
on conflict (user_id) do update set is_admin = true;

-- UUID ile (App Dashboard → Authentication → Users → User UID):
-- update public.user_stats set is_admin = true where user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
