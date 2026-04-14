
-- Drop restrictive anon policies and recreate as permissive

-- surveys: anon SELECT
DROP POLICY IF EXISTS "Surveys readable by anon via token" ON public.surveys;
CREATE POLICY "Surveys readable by anon via token"
  ON public.surveys FOR SELECT TO anon
  USING (is_active = true);

-- survey_options: anon SELECT
DROP POLICY IF EXISTS "Options readable by anon" ON public.survey_options;
CREATE POLICY "Options readable by anon"
  ON public.survey_options FOR SELECT TO anon
  USING (true);

-- survey_votes: anon INSERT
DROP POLICY IF EXISTS "Votes insertable by anon" ON public.survey_votes;
CREATE POLICY "Votes insertable by anon"
  ON public.survey_votes FOR INSERT TO anon
  WITH CHECK (true);

-- survey_votes: anon SELECT
DROP POLICY IF EXISTS "Votes readable by anon" ON public.survey_votes;
CREATE POLICY "Votes readable by anon"
  ON public.survey_votes FOR SELECT TO anon
  USING (true);
