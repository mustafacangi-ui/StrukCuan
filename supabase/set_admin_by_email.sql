-- Admin yapmak: BURAYA yazmayın — kendi e-postanızı kullanın.
-- Supabase SQL Editor'da çalıştırın.
--
-- user_stats.user_id = uuid ise:
update public.user_stats u
set is_admin = true
from auth.users a
where a.id = u.user_id
  and a.email = lower('ornek@email.com');  -- ← Kendi giriş e-postanız

-- Kaç satır güncellendi kontrol: 0 ise user_stats satırı yoktur, aşağıyı kullanın.

-- user_stats satırı yoksa (uuid user_id kolonu varsayımı):
insert into public.user_stats (user_id, is_admin)
select id, true
from auth.users
where email = lower('ornek@email.com')  -- ← Kendi e-postanız
on conflict (user_id) do update set is_admin = true;

-- UUID ile yapmak isterseniz SADECE gerçek UUID kullanın (36 karakter, tireli):
-- Örnek format: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UUID'yi bul: Dashboard → Authentication → Users → kullanıcı satırı → User UID kopyala
-- update public.user_stats set is_admin = true where user_id = 'YAPISTIR-DIGER-TARAFTAN-UUID';
