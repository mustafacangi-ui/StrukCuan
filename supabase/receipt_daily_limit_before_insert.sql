-- Server-side: REJECT receipt insert when daily limit (3) reached
-- Run in Supabase SQL Editor. Uses UTC for "today" (00:00 UTC to now).
-- Error message matches frontend: "Daily limit reached, try again tomorrow."

create or replace function public.check_receipt_daily_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where (user_id::text) = (new.user_id::text)
    and created_at >= v_utc_day_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_receipt_daily_limit on public.receipts;
create trigger trg_check_receipt_daily_limit
  before insert on public.receipts
  for each row execute function public.check_receipt_daily_limit();

-- RPC: Get today's receipt count (UTC). Single source of truth for "today".
-- Accepts uuid; receipts.user_id may be text or uuid - use ::text comparison to avoid uuid=text error.
create or replace function public.get_receipts_today_count(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where (user_id::text) = (p_user_id::text)
    and created_at >= v_utc_day_start;
  return coalesce(v_count, 0);
end;
$$;

-- RPC: Create receipt with daily limit check. Returns remaining count. UTC-based.
-- p_user_id must be auth user UUID. receipts.user_id stored as text(uuid) for compatibility.
create or replace function public.create_receipt(
  p_user_id uuid,
  p_image_url text,
  p_store text default null,
  p_total integer default null,
  p_receipt_index_today integer default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
  v_new_id bigint;
  v_remaining integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  select count(*) into v_count
  from public.receipts
  where (user_id::text) = (p_user_id::text)
    and created_at >= v_utc_day_start;

  if v_count >= 3 then
    raise exception 'Daily limit reached, try again tomorrow.';
  end if;

  insert into public.receipts (user_id, image_url, store, total, status, receipt_index_today)
  values (p_user_id::text, p_image_url, p_store, p_total, 'pending', p_receipt_index_today)
  returning id into v_new_id;

  -- remaining = DAILY_LIMIT - (count + 1) after this insert
  v_remaining := 3 - (v_count + 1);

  return jsonb_build_object('id', v_new_id, 'remaining', v_remaining);
end;
$$;

grant execute on function public.create_receipt(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.get_receipts_today_count(uuid) to authenticated;
