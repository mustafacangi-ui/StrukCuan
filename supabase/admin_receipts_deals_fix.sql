-- Admin: receipt UUID RPCs + RLS so admins can list all pending receipts.
-- Also normalizes is_admin checks for UUID user_stats (run in Supabase SQL Editor).
-- Prerequisites: receipts.id = uuid, user_stats.user_id = uuid, upsert_user_ticket(uuid, int, int).
--
-- Admin access (deal + receipt RPCs + optional client):
--   A) public.user_stats.is_admin = true for your user_id, OR
--   B) Supabase Dashboard → Authentication → user → User Metadata / App metadata:
--      add JSON key "is_admin": true under App metadata (raw_app_meta_data).
--   VITE_ADMIN_IDS alone does NOT grant RPC access (dev-only UI bypass in the app).

-- ─────────────────────────────────────────────────────────────────────────────
-- 0) Single source: admin = user_stats.is_admin OR auth app_metadata.is_admin
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_stats boolean;
  v_meta boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select coalesce(us.is_admin, false) into v_stats
  from public.user_stats us
  where us.user_id::text = v_uid::text
  limit 1;

  if coalesce(v_stats, false) then
    return true;
  end if;

  select coalesce((u.raw_app_meta_data->>'is_admin')::boolean, false)
  into v_meta
  from auth.users u
  where u.id = v_uid;

  return coalesce(v_meta, false);
end;
$$;

grant execute on function public.get_is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) RLS: admins can read all receipts (OR with existing "own receipts" policy)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Admins select all receipts" on public.receipts;
create policy "Admins select all receipts"
  on public.receipts for select to authenticated
  using ( public.get_is_admin() );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Deal RPCs: match user_stats.user_id as uuid (works if column is uuid)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.approve_deal(p_deal_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.get_is_admin() then
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
begin
  if not public.get_is_admin() then
    raise exception 'Unauthorized: admin only';
  end if;

  update public.deals set status = 'rejected' where id = p_deal_id and status = 'pending';
  if not found then
    raise exception 'Deal not found or not pending';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Receipt approve/reject — UUID id (parallel to legacy bigint overloads)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.approve_receipt_with_rewards(
  p_receipt_id uuid,
  p_cuan integer default 50,
  p_tiket integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_uuid uuid;
  v_draw_week integer;
  v_cur integer;
  v_add integer;
  i integer;
begin
  if not public.get_is_admin() then
    raise exception 'Unauthorized: admin only';
  end if;

  select user_id::uuid into v_user_uuid
  from public.receipts
  where id = p_receipt_id and status = 'pending'
  for update;

  if v_user_uuid is null then
    raise exception 'Receipt not found or not pending';
  end if;

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select coalesce(tickets, 0) into v_cur
  from public.user_tickets
  where user_id = v_user_uuid and draw_week = v_draw_week;

  update public.receipts
  set status = 'approved'
  where id = p_receipt_id;

  insert into public.user_stats (user_id, cuan, tiket)
  values (v_user_uuid, p_cuan, p_tiket)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + p_cuan,
    tiket = public.user_stats.tiket + p_tiket,
    updated_at = now();

  perform public.upsert_user_ticket(v_user_uuid, v_draw_week, p_tiket);

  v_add := least(p_tiket, greatest(0, 40 - v_cur));
  for i in 1..v_add loop
    insert into public.lottery_tickets (user_id, draw_week)
    values (v_user_uuid, v_draw_week);
  end loop;

  insert into public.notifications (user_id, title, message)
  values (
    v_user_uuid,
    'Receipt Approved',
    'Your receipt has been approved. You earned +' || p_cuan || ' cuan and +' || p_tiket || ' ticket.'
  );
end;
$$;

create or replace function public.reject_receipt(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.get_is_admin() then
    raise exception 'Unauthorized: admin only';
  end if;

  update public.receipts
  set status = 'rejected'
  where id = p_receipt_id and status = 'pending';

  if not found then
    raise exception 'Receipt not found or not pending';
  end if;
end;
$$;

grant execute on function public.approve_receipt_with_rewards(uuid, integer, integer) to authenticated;
grant execute on function public.reject_receipt(uuid) to authenticated;
