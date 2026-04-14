-- Add image_url column to survey_options
ALTER TABLE public.survey_options ADD COLUMN image_url text;

-- Create storage bucket for survey images
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-images', 'survey-images', true);

-- Allow authenticated users to upload
CREATE POLICY "Survey images uploadable by authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'survey-images');

-- Allow public read access
CREATE POLICY "Survey images readable by everyone"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'survey-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Survey images deletable by authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'survey-images');