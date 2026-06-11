DROP POLICY IF EXISTS "Approval attachments are publicly readable" ON storage.objects;
CREATE POLICY "Authenticated users can read approval attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'approval-attachments');