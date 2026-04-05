-- Deals Tablosu RLS Bypass (Geçici Çözüm)
-- Admin yetkisi hataları devam ediyorsa bu script ile doğrudan sizin UUID'nize yetki vereceğiz.
-- Ayrıca user_id sütununun durumu ile ilgili açıklamayı aşağıya ekliyorum.

-- 1. YÖNTEM: Sadece Sizin UUID'nize Doğrudan Update Yetkisi Verilmesi
DROP POLICY IF EXISTS "Admin Explicit Deal Update" ON public.deals;

CREATE POLICY "Admin Explicit Deal Update"
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING ( auth.uid() = 'ac549ad1-a341-4fc2-8d46-12787056a528' )
  WITH CHECK ( auth.uid() = 'ac549ad1-a341-4fc2-8d46-12787056a528' );

-- 2. YÖNTEM (Alternatif): Tüm RLS kurallarını devre dışı bırakmak (Güvenlik açısından önerilmez, ama test için kullanılabilir)
-- Eğer test için RLS'yi tamamen kapatmak isterseniz aşağıdaki yorum satırını kaldırarak çalıştırabilirsiniz:
-- ALTER TABLE public.deals DISABLE ROW LEVEL SECURITY;

-- BİLGİLENDİRME: deals tablosundaki user_id kolonu
-- deals tablonuzda 'user_id' sütunu text formatında tutulmaktadır ve auth.users tablosu ile 
-- doğrudan "Foreign Key" (yabancı anahtar) bağlantısı bulunmamaktadır.
-- Ancak Trigger (handle_deal_activation_rewards) bunu başarıyla işlemesi için tasarlanmıştır, 
-- çünkü "v_user_uuid := new.user_id::uuid;" şeklinde güvenli bir dönüşüm (cast) uygulanmaktadır.
-- Bu nedenle tablo yapısında herhangi bir bozukluk YOKTUR ve bağlamı doğru çalışır.
