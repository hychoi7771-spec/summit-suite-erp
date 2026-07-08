DROP POLICY IF EXISTS "channels manageable by managers" ON public.sales_channels;
CREATE POLICY "channels manageable by authenticated" ON public.sales_channels
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);