
CREATE TABLE public.cost_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_name text NOT NULL,
  notes text,
  total_cost integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_analysis
  ADD COLUMN version_id uuid REFERENCES public.cost_versions(id) ON DELETE CASCADE;

ALTER TABLE public.cost_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cost versions viewable by authenticated"
  ON public.cost_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cost versions insertable by authenticated"
  ON public.cost_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Cost versions updatable by authenticated"
  ON public.cost_versions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Cost versions deletable by admins"
  ON public.cost_versions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director'));
