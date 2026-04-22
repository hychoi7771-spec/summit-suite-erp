INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-audio', 'meeting-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view meeting audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'meeting-audio');

CREATE POLICY "Users can upload meeting audio files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own meeting audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own meeting audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);