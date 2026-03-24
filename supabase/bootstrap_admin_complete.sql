-- =============================================================================
-- StrukCuan — Kalıcı admin yetkisi (tek çalıştırma)
-- Supabase SQL Editor: önce admin_receipts_deals_fix.sql (get_is_admin dahil),
-- sonra BU dosyayı çalıştırın.
--
-- AŞAMA 1: Aşağıdaki e-postayı kendi admin hesabınızla değiştirin (tek yer).
-- =============================================================================

do $$
declare
  v_email constant text := lower('your-email@example.com');  -- ← DEĞİŞTİR
  v_uid   uuid;
begin
  select id into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'auth.users içinde bu e-posta bulunamadı: %', v_email;
  end if;

  -- App metadata: get_is_admin() bunu da okur (JWT yenilenince geçerli olur)
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('is_admin', true)
  where id = v_uid;

  -- user_stats: satır yoksa oluştur, varsa is_admin güncelle
  insert into public.user_stats (user_id, is_admin)
  values (v_uid, true)
  on conflict (user_id) do update set is_admin = true;

  raise notice 'Admin atandı: user_id = %', v_uid;
end;
$$;

-- get_is_admin() app_metadata için auth.users tablosunu okur; çoğu zaman anında çalışır.
-- Doğrulama: web uygulamasında admin hesabıyla giriş yapıp Deal / Receipt Approve dene.
