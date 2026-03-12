-- Add receipt_index_today to receipts table
-- Run in Supabase SQL Editor

alter table public.receipts
  add column if not exists receipt_index_today integer;

comment on column public.receipts.receipt_index_today is '1, 2, or 3 - indicates which receipt of the day this is for the user';
