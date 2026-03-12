-- Admin approve receipt with custom cuan and ticket rewards
-- Run in Supabase SQL Editor after receipt_index_today_migration.sql

-- Optional: Replace insert trigger to NOT give rewards on insert (rewards only from admin approval)
-- Uncomment if you want admin to be the sole source of rewards:
/*
create or replace function public.on_receipt_insert_reward()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_stats (user_id, total_receipts, level)
  values (new.user_id, 1, 1)
  on conflict (user_id)
  do update set
    total_receipts = public.user_stats.total_receipts + 1,
    level = public.level_from_receipts(public.user_stats.total_receipts + 1),
    updated_at = now();
  return new;
end;
$$;
*/

create or replace function public.approve_receipt_with_rewards(
  p_receipt_id bigint,
  p_cuan integer default 50,
  p_tiket integer default 1
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id text;
begin
  select user_id into v_user_id
  from public.receipts
  where id = p_receipt_id and status = 'pending'
  for update;

  if v_user_id is null then
    raise exception 'Receipt not found or not pending';
  end if;

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

  insert into public.notifications (user_id, title, message)
  values (
    v_user_id,
    'Receipt Approved',
    'Your receipt has been approved. You earned +' || p_cuan || ' cuan and +' || p_tiket || ' ticket.'
  );
end;
$$;
