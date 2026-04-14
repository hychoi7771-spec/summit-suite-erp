
CREATE TABLE public.design_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT '검토중',
  file_urls text[] DEFAULT '{}',
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  assignee_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Design reviews viewable by authenticated" ON public.design_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Design reviews insertable by authenticated" ON public.design_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Design reviews updatable by uploader or admin" ON public.design_reviews FOR UPDATE TO authenticated USING (
  uploaded_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);
CREATE POLICY "Design reviews deletable by uploader or admin" ON public.design_reviews FOR DELETE TO authenticated USING (
  uploaded_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);

CREATE TABLE public.design_review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.design_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  is_revision_request boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review comments viewable by authenticated" ON public.design_review_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Review comments insertable by authenticated" ON public.design_review_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Review comments deletable by author or admin" ON public.design_review_comments FOR DELETE TO authenticated USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);

INSERT INTO storage.buckets (id, name, public) VALUES ('design-reviews', 'design-reviews', true);

CREATE POLICY "Design review files uploadable by authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'design-reviews');
CREATE POLICY "Design review files viewable by all" ON storage.objects FOR SELECT USING (bucket_id = 'design-reviews');
CREATE POLICY "Design review files deletable by authenticated" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'design-reviews');
