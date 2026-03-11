-- Run this in Supabase SQL Editor.
-- It creates:
-- - Storage bucket: receipts
-- - Table: public.receipts
-- - Table: public.user_stats (to store points/tickets per user_id)
-- - RPCs: approve_receipt, reject_receipt

-- 1) Storage bucket "receipts"
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = excluded.public;

-- 2) Database tables
create table if not exists public.user_stats (
  user_id text primary key,
  cuan integer not null default 0,
  tiket integer not null default 0,
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_stats_updated_at on public.user_stats;
create trigger trg_user_stats_updated_at
before update on public.user_stats
for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_type where typname = 'receipt_status') then
    create type public.receipt_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.receipts (
  id bigserial primary key,
  user_id text not null,
  image_url text not null,
  store text,
  total numeric,
  status public.receipt_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists receipts_status_idx on public.receipts (status);
create index if not exists receipts_user_id_idx on public.receipts (user_id);

create table if not exists public.notifications (
  id bigserial primary key,
  user_id text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_read_idx on public.notifications (read);

-- 3) RPC: approve (atomic update + reward)
create or replace function public.approve_receipt(p_receipt_id bigint)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id text;
begin
  -- Lock the receipt row, ensure it's still pending
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
  values (v_user_id, 50, 1)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + 50,
    tiket = public.user_stats.tiket + 1;

  insert into public.notifications (user_id, title, message)
  values (
    v_user_id,
    'Receipt Approved',
    'Your receipt has been approved. You earned +50 cuan and +1 ticket.'
  );
end;
$$;

create or replace function public.reject_receipt(p_receipt_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update public.receipts
  set status = 'rejected'
  where id = p_receipt_id and status = 'pending';
end;
$$;

-- NOTE: For production you should add RLS policies for:
-- - receipts (users can insert/select their own)
-- - user_stats (users can read their own)
-- and restrict admin functions using auth role checks.

