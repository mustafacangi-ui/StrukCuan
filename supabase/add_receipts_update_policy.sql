-- Allow users to update their own receipts (needed for AI OCR injection after upload)
CREATE POLICY "Users update own receipts"
  ON public.receipts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow admins to read all receipts (so they can moderate them)
DROP POLICY IF EXISTS "Admins read all receipts" ON public.receipts;
CREATE POLICY "Admins read all receipts"
  ON public.receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stats
      WHERE user_stats.user_id = auth.uid()
      AND user_stats.is_admin = true
    )
  );

-- Allow admins to update all receipts (so they can approve/reject)
DROP POLICY IF EXISTS "Admins update all receipts" ON public.receipts;
CREATE POLICY "Admins update all receipts"
  ON public.receipts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stats
      WHERE user_stats.user_id = auth.uid()
      AND user_stats.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_stats
      WHERE user_stats.user_id = auth.uid()
      AND user_stats.is_admin = true
    )
  );
