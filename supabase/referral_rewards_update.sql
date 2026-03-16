-- Referral Ödül Güncellemesi
-- Davet eden: +5 Bilet, Yeni üye: +2 Bilet, friends_joined +1
-- Tetikleyici: İlk fiş ONAYLANDIĞINDA (status = 'approved')
-- Supabase SQL Editor'da çalıştırın (referrals_migration.sql sonrası).

-- 1) user_stats'a friends_joined ekle
alter table public.user_stats
  add column if not exists friends_joined integer not null default 0;

-- 2) Eski INSERT tetikleyicisini kaldır
drop trigger if exists receipts_referral_reward_trigger on public.receipts;

-- 3) Yeni tetikleyici: Receipt ONAYLANDIĞINDA (UPDATE status -> approved)
create or replace function public.on_receipt_approved_referral_reward()
returns trigger
language plpgsql
security definer
as $$
declare
  v_referral record;
  v_approved_count int;
  v_referrer_id text;
  v_referred_id text;
  v_draw_week integer;
  i integer;
begin
  -- Sadece pending -> approved geçişinde çalış
  if old.status <> 'pending' or new.status <> 'approved' then
    return new;
  end if;

  -- Bu kullanıcının ONAYLANMIŞ fiş sayısı (bu güncellemeden sonra 1 olacak)
  select count(*) into v_approved_count
  from public.receipts
  where user_id = new.user_id and status = 'approved';

  if v_approved_count <> 1 then
    return new;
  end if;

  -- Referral kaydı var mı? (referrals tablosu user_id text kullanır)
  select * into v_referral
  from public.referrals
  where referred_user_id = new.user_id and reward_given = false
  limit 1 for update;

  if v_referral is null then
    return new;
  end if;

  v_referrer_id := v_referral.referrer_user_id;
  v_referred_id := v_referral.referred_user_id;

  update public.referrals set reward_given = true where id = v_referral.id;

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Davet eden: +5 Bilet (user_stats + user_tickets + lottery_tickets)
  insert into public.user_stats (user_id, tiket, friends_joined)
  values (v_referrer_id, 5, 1)
  on conflict (user_id) do update set
    tiket = public.user_stats.tiket + 5,
    friends_joined = public.user_stats.friends_joined + 1,
    updated_at = now();

  perform public.upsert_user_ticket(v_referrer_id, v_draw_week, 5);
  for i in 1..5 loop
    insert into public.lottery_tickets (user_id, draw_week) values (v_referrer_id, v_draw_week);
  end loop;

  -- Yeni üye: +2 Bilet hoş geldin bonusu
  insert into public.user_stats (user_id, tiket)
  values (v_referred_id, 2)
  on conflict (user_id) do update set
    tiket = public.user_stats.tiket + 2,
    updated_at = now();

  perform public.upsert_user_ticket(v_referred_id, v_draw_week, 2);
  for i in 1..2 loop
    insert into public.lottery_tickets (user_id, draw_week) values (v_referred_id, v_draw_week);
  end loop;

  -- Bildirimler
  insert into public.notifications (user_id, title, message)
  values (v_referrer_id, 'Referral Reward!', 'Teman yang kamu undang sudah upload struk pertama. Kamu dapat +5 tiket!');

  insert into public.notifications (user_id, title, message)
  values (v_referred_id, 'Referral Bonus!', 'Kamu dapat +2 tiket bonus dari undangan teman!');

  return new;
end;
$$;

create trigger receipts_referral_reward_on_approve
  after update on public.receipts
  for each row execute function public.on_receipt_approved_referral_reward();
