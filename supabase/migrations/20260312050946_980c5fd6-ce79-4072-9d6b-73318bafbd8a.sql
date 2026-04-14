
-- Add project status and participants to products
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('active', 'on_hold', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS project_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}'::uuid[];

-- Task comments table
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  mentioned_user_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task comments viewable by authenticated" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Task comments insertable by authenticated" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Task comments deletable by author or admin" ON public.task_comments FOR DELETE TO authenticated USING (
  (user_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

-- Task history table
CREATE TABLE public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task history viewable by authenticated" ON public.task_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Task history insertable by authenticated" ON public.task_history FOR INSERT TO authenticated WITH CHECK (true);

-- Task links (related tasks)
CREATE TABLE public.task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  target_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_task_id, target_task_id)
);

ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task links viewable by authenticated" ON public.task_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Task links insertable by authenticated" ON public.task_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Task links deletable by authenticated" ON public.task_links FOR DELETE TO authenticated USING (true);

-- Enable realtime for task_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
