
ALTER TABLE public.tasks
  ADD COLUMN is_design_request boolean NOT NULL DEFAULT false,
  ADD COLUMN project_name text,
  ADD COLUMN key_story text,
  ADD COLUMN attachments text[] DEFAULT '{}'::text[];

-- Storage bucket for design request attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('design-attachments', 'design-attachments', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated can upload design attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'design-attachments');

CREATE POLICY "Anyone can view design attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'design-attachments');

CREATE POLICY "Authenticated can delete own design attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'design-attachments');
