
-- Launch process steps table
CREATE TABLE public.launch_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  phase text NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  deadline date,
  position integer NOT NULL DEFAULT 0,
  is_critical boolean NOT NULL DEFAULT false,
  notes text,
  file_urls text[] DEFAULT '{}'::text[],
  category_filter text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Launch step dependencies table
CREATE TABLE public.launch_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_step_id uuid REFERENCES public.launch_steps(id) ON DELETE CASCADE NOT NULL,
  target_step_id uuid REFERENCES public.launch_steps(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_step_id, target_step_id)
);

-- RLS for launch_steps
ALTER TABLE public.launch_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Launch steps viewable by authenticated" ON public.launch_steps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Launch steps insertable by authenticated" ON public.launch_steps
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Launch steps updatable by authenticated" ON public.launch_steps
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Launch steps deletable by admins" ON public.launch_steps
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'general_director'::app_role)
  );

-- RLS for launch_dependencies
ALTER TABLE public.launch_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Launch deps viewable by authenticated" ON public.launch_dependencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Launch deps insertable by authenticated" ON public.launch_dependencies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Launch deps deletable by authenticated" ON public.launch_dependencies
  FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER update_launch_steps_updated_at
  BEFORE UPDATE ON public.launch_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
