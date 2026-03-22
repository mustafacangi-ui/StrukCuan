-- Server-side: REJECT receipt insert when daily limit (3) reached
-- Run in Supabase SQL Editor. Uses Asia/Jakarta for "today" (00:00 to now).
-- Error message matches frontend: "Daily limit reached, try again tomorrow."

create or replace function public.check_receipt_daily_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where user_id = new.user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

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

-- RPC: Get today's receipt count (Asia/Jakarta). Matches backend validation.
create or replace function public.get_receipts_today_count(p_user_id text)
returns integer
language plpgsql
security definer
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_count integer;
begin
  select count(*) into v_count
  from public.receipts
  where user_id = p_user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;
  return coalesce(v_count, 0);
end;
$$;
