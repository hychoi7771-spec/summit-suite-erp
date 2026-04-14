
-- Cost analysis table for products
CREATE TABLE public.cost_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  unit_cost INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  estimate_file_id UUID REFERENCES public.asset_files(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cost analysis viewable by authenticated" ON public.cost_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cost analysis insertable by authenticated" ON public.cost_analysis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Cost analysis updatable by authenticated" ON public.cost_analysis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Cost analysis deletable by admins" ON public.cost_analysis FOR DELETE TO authenticated USING (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director'));

-- Notices table
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notices viewable by authenticated" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notices insertable by authenticated" ON public.notices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Notices updatable by author or admin" ON public.notices FOR UPDATE TO authenticated USING (
  author_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director')
);
CREATE POLICY "Notices deletable by author or admin" ON public.notices FOR DELETE TO authenticated USING (
  author_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director')
);
