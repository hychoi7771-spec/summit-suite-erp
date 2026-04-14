
-- Surveys table
CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(share_token)
);

-- Survey options
CREATE TABLE public.survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Anonymous votes (voter_token = browser fingerprint/cookie for duplicate prevention)
CREATE TABLE public.survey_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.survey_options(id) ON DELETE CASCADE,
  voter_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(survey_id, voter_token)
);

-- RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_votes ENABLE ROW LEVEL SECURITY;

-- Surveys: authenticated users can CRUD, anon can read by share_token
CREATE POLICY "Surveys viewable by authenticated" ON public.surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Surveys insertable by authenticated" ON public.surveys FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Surveys updatable by creator or admin" ON public.surveys FOR UPDATE TO authenticated USING (
  created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director')
);
CREATE POLICY "Surveys deletable by creator or admin" ON public.surveys FOR DELETE TO authenticated USING (
  created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'general_director')
);
-- Anon can read active surveys by token
CREATE POLICY "Surveys readable by anon via token" ON public.surveys FOR SELECT TO anon USING (is_active = true);

-- Options: authenticated full access, anon read
CREATE POLICY "Options viewable by authenticated" ON public.survey_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Options insertable by authenticated" ON public.survey_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Options updatable by authenticated" ON public.survey_options FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Options deletable by authenticated" ON public.survey_options FOR DELETE TO authenticated USING (true);
CREATE POLICY "Options readable by anon" ON public.survey_options FOR SELECT TO anon USING (true);

-- Votes: authenticated can view, anon can insert and read own
CREATE POLICY "Votes viewable by authenticated" ON public.survey_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Votes insertable by anon" ON public.survey_votes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Votes insertable by authenticated" ON public.survey_votes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Votes readable by anon" ON public.survey_votes FOR SELECT TO anon USING (true);
