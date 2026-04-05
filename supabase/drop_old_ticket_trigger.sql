-- Bu script, eski sisteme ait olan ve hata çıkaran arka plan Trigger kontrolünü tamamen siler.
-- Artık bilet (ticket) güncelleme işlemleri tamamen frontend (useAdminDeals.ts) üzerinden yönetilecektir.

drop trigger if exists on_deal_activation on public.deals;
drop function if exists public.handle_deal_activation_rewards();
