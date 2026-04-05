ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS image_hash text;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_duplicate_score numeric;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS ai_duplicate_receipt_id text;
