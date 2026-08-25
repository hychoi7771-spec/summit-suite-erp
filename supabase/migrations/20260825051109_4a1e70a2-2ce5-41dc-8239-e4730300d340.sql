CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL,
  description text,
  priority task_priority NOT NULL DEFAULT 'medium',
  category_id uuid REFERENCES public.task_categories(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_name text,
  tags text[] DEFAULT '{}',
  recurrence text NOT NULL DEFAULT 'none',
  weekdays integer[] DEFAULT '{}',
  month_day integer,
  due_offset_days integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_generated_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT ALL ON public.task_templates TO service_role;

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates_select_auth" ON public.task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_templates_insert_own" ON public.task_templates FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "task_templates_update_own" ON public.task_templates FOR UPDATE TO authenticated
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'))
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'));
CREATE POLICY "task_templates_delete_own" ON public.task_templates FOR DELETE TO authenticated
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'));

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();