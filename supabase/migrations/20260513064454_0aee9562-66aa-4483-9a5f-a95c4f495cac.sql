
INSERT INTO storage.buckets (id, name, public)
VALUES ('approval-attachments', 'approval-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Approval attachments are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'approval-attachments');

CREATE POLICY "Authenticated users can upload approval attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'approval-attachments');

CREATE POLICY "Authenticated users can update approval attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'approval-attachments');

CREATE POLICY "Authenticated users can delete approval attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'approval-attachments');
