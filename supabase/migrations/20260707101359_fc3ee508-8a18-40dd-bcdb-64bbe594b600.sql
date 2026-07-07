
-- Drop the too-strict INSERT policy just added, and the existing overly-strict delete
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;

-- INSERT: own expense folder, own root folder, or shared library folder
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1] = 'expenses' AND (storage.foldername(name))[2] = (auth.uid())::text)
    OR (storage.foldername(name))[1] = 'library'
  )
);

-- UPDATE (overwrite): same ownership rules or admin
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1] = 'expenses' AND (storage.foldername(name))[2] = (auth.uid())::text)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1] = 'expenses' AND (storage.foldername(name))[2] = (auth.uid())::text)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
  )
);

-- DELETE: own expense/root file, or admin (library files admin-only to prevent cross-user deletion)
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1] = 'expenses' AND (storage.foldername(name))[2] = (auth.uid())::text)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
  )
);
