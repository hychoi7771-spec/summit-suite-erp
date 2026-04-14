
CREATE TABLE public.product_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.product_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON public.product_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Comments insertable by authenticated"
  ON public.product_comments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Comments deletable by author or admin"
  ON public.product_comments FOR DELETE TO authenticated
  USING (
    user_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo')
    OR has_role(auth.uid(), 'general_director')
  );

CREATE POLICY "Products deletable by admins"
  ON public.products FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director'));
