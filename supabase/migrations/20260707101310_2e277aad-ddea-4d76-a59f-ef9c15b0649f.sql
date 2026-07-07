
-- 1) design-attachments INSERT: enforce folder ownership (uploader's profile id)
DROP POLICY IF EXISTS "design_attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload design attachments" ON storage.objects;
CREATE POLICY "design_attachments_insert_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'design-attachments'
  AND split_part(name, '/', 1) IN (
    SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- 2) receipts bucket: remove broad policies; keep only folder-scoped ownership
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own receipts" ON storage.objects;

CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- (The existing "Users can delete own receipts" folder-scoped DELETE policy is kept as-is.)

-- 3) notices: drop hardcoded UUID bypass, keep only role-based admin checks
DROP POLICY IF EXISTS "Notices updatable by author or admin" ON public.notices;
CREATE POLICY "Notices updatable by author or admin"
ON public.notices FOR UPDATE TO authenticated
USING (
  author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
)
WITH CHECK (
  author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

DROP POLICY IF EXISTS "Notices deletable by author or admin" ON public.notices;
CREATE POLICY "Notices deletable by author or admin"
ON public.notices FOR DELETE TO authenticated
USING (
  author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);
