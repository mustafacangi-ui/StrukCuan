-- Add AI Automated Moderation Tracking to Receipts
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS ai_auto_processed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_processed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ai_processing_reason text;

-- Create app_settings table for generic feature flags & secure configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default AI setting safely
INSERT INTO public.app_settings (key, value) 
VALUES ('ai_auto_approve_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Turn on RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Allow select for authenticated users" 
  ON public.app_settings FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow authenticated users (specifically admins checking it) to update settings 
CREATE POLICY "Allow update for authenticated users" 
  ON public.app_settings FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);
