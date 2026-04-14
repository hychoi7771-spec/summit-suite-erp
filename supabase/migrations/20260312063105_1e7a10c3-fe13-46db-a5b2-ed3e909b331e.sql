
-- Table to persist drawing annotations per review per image
CREATE TABLE public.design_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.design_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  image_index integer NOT NULL DEFAULT 0,
  strokes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id, image_index)
);

ALTER TABLE public.design_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Annotations viewable by authenticated"
  ON public.design_annotations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Annotations insertable by authenticated"
  ON public.design_annotations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Annotations updatable by owner or admin"
  ON public.design_annotations FOR UPDATE TO authenticated
  USING (
    user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo')
    OR has_role(auth.uid(), 'general_director')
  );

CREATE POLICY "Annotations deletable by owner or admin"
  ON public.design_annotations FOR DELETE TO authenticated
  USING (
    user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo')
    OR has_role(auth.uid(), 'general_director')
  );

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_review_comments;
