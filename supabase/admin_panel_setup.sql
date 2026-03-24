-- Admin Panel: user_stats.is_admin + deals pending onay
-- Supabase SQL Editor'da çalıştırın.

-- 1) user_stats'a is_admin ekle
alter table public.user_stats
  add column if not exists is_admin boolean not null default false;

-- Kendi user_id'nizi admin yapmak için (birini çalıştırın):
-- update public.user_stats set is_admin = true where user_id = 'SIZIN-UUID-BURAYA';
-- insert into public.user_stats (user_id, is_admin) values ('SIZIN-UUID-BURAYA', true) on conflict (user_id) do update set is_admin = true;

-- 2) deals: status 'pending' ve 'rejected' destekle
-- Mevcut deals active kalır. Yeni indirimler status='pending' ile eklenir.

-- 3) Admin-only RPC: approve_deal, reject_deal (user_stats.is_admin = true)
create or replace function public.approve_deal(p_deal_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
begin
  select coalesce(is_admin, false) into v_is_admin
  from public.user_stats where user_id = auth.uid();
  if not v_is_admin then
    raise exception 'Unauthorized: admin only';
  end if;
  update public.deals set status = 'active' where id = p_deal_id and status = 'pending';
  if not found then
    raise exception 'Deal not found or not pending';
  end if;
end;
$$;

create or replace function public.reject_deal(p_deal_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
begin
  select coalesce(is_admin, false) into v_is_admin
  from public.user_stats where user_id = auth.uid();
  if not v_is_admin then
    raise exception 'Unauthorized: admin only';
  end if;
  update public.deals set status = 'rejected' where id = p_deal_id and status = 'pending';
  if not found then
    raise exception 'Deal not found or not pending';
  end if;
end;
$$;

grant execute on function public.approve_deal(bigint) to authenticated;
grant execute on function public.reject_deal(bigint) to authenticated;
