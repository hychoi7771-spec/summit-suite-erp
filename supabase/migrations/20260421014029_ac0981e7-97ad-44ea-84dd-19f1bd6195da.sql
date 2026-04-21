-- Allow authenticated users to manage files in design-attachments bucket
CREATE POLICY "design_attachments_select_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-attachments');

CREATE POLICY "design_attachments_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'design-attachments');

CREATE POLICY "design_attachments_update_authenticated"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'design-attachments');

CREATE POLICY "design_attachments_delete_authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'design-attachments');