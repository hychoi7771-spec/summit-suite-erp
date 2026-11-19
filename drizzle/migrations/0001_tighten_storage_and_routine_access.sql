ALTER POLICY "Design review files updatable by owner or manager" ON storage.objects
  WITH CHECK ((bucket_id = 'design-reviews') AND ((owner = auth.uid()) OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR public.has_role(auth.uid(), 'deputy_gm')));
ALTER POLICY "Survey images updatable by owner or manager" ON storage.objects
  WITH CHECK ((bucket_id = 'survey-images') AND ((owner = auth.uid()) OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR public.has_role(auth.uid(), 'deputy_gm')));
ALTER POLICY "Survey images uploadable by authenticated" ON storage.objects
  WITH CHECK ((bucket_id = 'survey-images') AND owner = auth.uid());
ALTER POLICY "Users can upload own receipts" ON storage.objects
  WITH CHECK ((bucket_id = 'receipts') AND owner = auth.uid() AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (((storage.foldername(name))[1] = 'expenses') AND ((storage.foldername(name))[2] = (auth.uid())::text)) OR ((storage.foldername(name))[1] = 'library')));
ALTER POLICY "Design review files viewable by all" ON storage.objects TO authenticated;
ALTER POLICY "Routine templates viewable by authenticated" ON public.routine_templates USING (user_id = auth.uid());
ALTER POLICY "Routine completions viewable by authenticated" ON public.routine_completions USING (user_id = auth.uid());