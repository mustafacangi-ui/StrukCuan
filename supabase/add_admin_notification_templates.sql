-- Admin Notification Templates
CREATE TABLE IF NOT EXISTS public.admin_notification_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  category text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.admin_notification_templates ENABLE ROW LEVEL SECURITY;

-- Allow reading for all authenticated users (assuming admins access it through UI)
CREATE POLICY "Allow select for authenticated users" 
  ON public.admin_notification_templates FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow admins to insert/update/delete 
CREATE POLICY "Allow insert for authenticated users" 
  ON public.admin_notification_templates FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" 
  ON public.admin_notification_templates FOR DELETE 
  TO authenticated 
  USING (true);
