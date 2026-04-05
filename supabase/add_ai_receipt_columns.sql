-- Phase 1 MVP: Add AI extraction columns to the receipts table
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_store_name text;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_product_name text;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_original_price numeric;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_discount_price numeric;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_discount_percent numeric;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_expiry_date text;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_red_label boolean default false;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_suggested_ticket_reward integer default 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_confidence numeric;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_raw_text text;
