-- Fix: Drop all conflicting function versions and recreate with correct types
-- Run in Supabase SQL Editor

-- =============================================================================
-- 1) DROP ALL CONFLICTING FUNCTION VERSIONS WITH CASCADE
-- =============================================================================

-- Drop all versions of approve_receipt_with_rewards
drop function if exists public.approve_receipt_with_rewards(bigint, integer, integer) cascade;
drop function if exists public.approve_receipt_with_rewards(uuid, integer, integer) cascade;

-- Drop all versions of reject_receipt
drop function if exists public.reject_receipt(bigint) cascade;
drop function if exists public.reject_receipt(uuid) cascade;

-- Drop all versions of upsert_user_ticket
drop function if exists public.upsert_user_ticket(text, integer, integer) cascade;
drop function if exists public.upsert_user_ticket(uuid, integer, integer) cascade;

-- =============================================================================
-- 2) RECREATE FUNCTIONS WITH CORRECT TYPES
-- =============================================================================

-- approve_receipt_with_rewards - receipts.id is bigserial (bigint)
create or replace function public.approve_receipt_with_rewards(
  p_receipt_id bigint,
  p_cuan integer default 50,
  p_tiket integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_draw_week integer;
  v_cur integer;
  v_add integer;
  i integer;
begin
  if not public.get_is_admin() then
    raise exception 'Unauthorized: admin only';
  end if;

  select user_id into v_user_id
  from public.receipts
  where id = p_receipt_id and status = 'pending'
  for update;

  if v_user_id is null then
    raise exception 'Receipt not found or not pending';
  end if;

  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  select coalesce(tickets, 0) into v_cur
  from public.user_tickets
  where user_id = v_user_id::uuid and draw_week = v_draw_week;

  update public.receipts
  set status = 'approved'
  where id = p_receipt_id;

  insert into public.user_stats (user_id, cuan, tiket)
  values (v_user_id, p_cuan, p_tiket)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + p_cuan,
    tiket = public.user_stats.tiket + p_tiket,
    updated_at = now();

  -- user_tickets table has user_id as uuid
  perform public.upsert_user_ticket(v_user_id::uuid, v_draw_week, p_tiket);

  v_add := least(p_tiket, greatest(0, 40 - v_cur));
  for i in 1..v_add loop
    insert into public.lottery_tickets (user_id, draw_week)
    values (v_user_id::uuid, v_draw_week);
  end loop;

  insert into public.notifications (user_id, title, message)
  values (
    v_user_id,
    'Receipt Approved',
    'Your receipt has been approved. You earned +' || p_cuan || ' cuan and +' || p_tiket || ' ticket.'
  );
end;
$$;

-- reject_receipt - receipts.id is bigint
create or replace function public.reject_receipt(p_receipt_id bigint)
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

-- upsert_user_ticket - user_tickets.user_id is uuid per reset_ticket_system_clean.sql
create or replace function public.upsert_user_ticket(p_user_id uuid, p_draw_week integer, p_add integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tickets (user_id, draw_week, tickets, updated_at)
  values (p_user_id, p_draw_week, least(p_add, 40), now())
  on conflict (user_id, draw_week)
  do update set tickets = least(public.user_tickets.tickets + p_add, 40), updated_at = now();
end;
$$;

-- =============================================================================
-- 3) GRANT PERMISSIONS
-- =============================================================================
grant execute on function public.approve_receipt_with_rewards(bigint, integer, integer) to authenticated;
grant execute on function public.reject_receipt(bigint) to authenticated;
grant execute on function public.upsert_user_ticket(uuid, integer, integer) to authenticated;
