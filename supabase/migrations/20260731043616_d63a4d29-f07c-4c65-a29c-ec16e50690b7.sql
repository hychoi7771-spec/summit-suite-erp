-- 1) receipts bucket: restrict reads
DROP POLICY IF EXISTS "Authenticated users can read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;

CREATE POLICY "Receipts readable by owner or admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1] = 'expenses' AND (storage.foldername(name))[2] = (auth.uid())::text)
    OR (storage.foldername(name))[1] = 'library'
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
  )
);

-- 2) meetings insert: require creator to be an attendee (or manager)
DROP POLICY IF EXISTS "Meetings insertable by authenticated" ON public.meetings;

CREATE POLICY "Meetings insertable by attendee or manager"
ON public.meetings FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR (
    (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()) = ANY (COALESCE(attendee_ids, '{}'::uuid[]))
  )
);