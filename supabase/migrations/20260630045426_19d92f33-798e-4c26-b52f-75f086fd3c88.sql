
-- profiles.manager_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Kudos
CREATE TABLE IF NOT EXISTS public.kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'thanks' CHECK (category IN ('thanks','collab','creative','growth')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_kudos_to ON public.kudos(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kudos_from ON public.kudos(from_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kudos TO authenticated;
GRANT ALL ON public.kudos TO service_role;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kudos_select_all" ON public.kudos FOR SELECT TO authenticated USING (true);
CREATE POLICY "kudos_insert_own" ON public.kudos FOR INSERT TO authenticated
  WITH CHECK (from_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "kudos_update_own" ON public.kudos FOR UPDATE TO authenticated
  USING (from_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "kudos_delete_own" ON public.kudos FOR DELETE TO authenticated
  USING (from_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_kudos_updated_at BEFORE UPDATE ON public.kudos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1:1 Feedback
CREATE TABLE IF NOT EXISTS public.one_on_one_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('private','shared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_one_on_one_pair ON public.one_on_one_feedback(author_id, target_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.one_on_one_feedback TO authenticated;
GRANT ALL ON public.one_on_one_feedback TO service_role;
ALTER TABLE public.one_on_one_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "1on1_select" ON public.one_on_one_feedback FOR SELECT TO authenticated
  USING (
    author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR (visibility = 'shared' AND target_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "1on1_insert" ON public.one_on_one_feedback FOR INSERT TO authenticated
  WITH CHECK (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "1on1_update_own" ON public.one_on_one_feedback FOR UPDATE TO authenticated
  USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "1on1_delete_own" ON public.one_on_one_feedback FOR DELETE TO authenticated
  USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_one_on_one_updated_at BEFORE UPDATE ON public.one_on_one_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
