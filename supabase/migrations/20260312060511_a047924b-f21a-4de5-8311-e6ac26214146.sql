
-- Project folders table
CREATE TABLE public.project_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Folders viewable by authenticated" ON public.project_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Folders insertable by authenticated" ON public.project_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Folders updatable by creator or admin" ON public.project_folders FOR UPDATE TO authenticated USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director')
);
CREATE POLICY "Folders deletable by creator or admin" ON public.project_folders FOR DELETE TO authenticated USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director')
);

-- Add folder_id to products table
ALTER TABLE public.products ADD COLUMN folder_id uuid REFERENCES public.project_folders(id) ON DELETE SET NULL DEFAULT NULL;

-- Drafts table for temporary saves
CREATE TABLE public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'task',
  title text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts" ON public.drafts FOR SELECT TO authenticated USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own drafts" ON public.drafts FOR INSERT TO authenticated WITH CHECK (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own drafts" ON public.drafts FOR UPDATE TO authenticated USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own drafts" ON public.drafts FOR DELETE TO authenticated USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
