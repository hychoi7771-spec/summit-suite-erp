-- Allow authenticated users to upload to receipts bucket
CREATE POLICY "Authenticated users can upload to receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow authenticated users to read from receipts bucket
CREATE POLICY "Authenticated users can read receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete own receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts');