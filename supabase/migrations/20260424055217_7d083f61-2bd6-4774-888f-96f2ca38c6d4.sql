-- Create task_categories table
CREATE TABLE public.task_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Categories viewable by authenticated"
ON public.task_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Categories insertable by admins"
ON public.task_categories
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

CREATE POLICY "Categories updatable by admins"
ON public.task_categories
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

CREATE POLICY "Categories deletable by admins"
ON public.task_categories
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_task_categories_updated_at
BEFORE UPDATE ON public.task_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add category_id to tasks
ALTER TABLE public.tasks ADD COLUMN category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_category_id ON public.tasks(category_id);

-- Seed default categories
INSERT INTO public.task_categories (name, icon, color, sort_order) VALUES
  ('런칭 준비', '🚀', '#ef4444', 1),
  ('디자인', '🎨', '#a855f7', 2),
  ('생산/발주', '📦', '#f59e0b', 3),
  ('인허가', '📋', '#10b981', 4),
  ('온라인 이커머스 MD', '💰', '#3b82f6', 5),
  ('운영/기타', '🛠', '#64748b', 6);
