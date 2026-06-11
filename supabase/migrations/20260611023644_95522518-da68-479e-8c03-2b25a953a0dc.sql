
-- 1) Surveys: remove broad anon SELECT
DROP POLICY IF EXISTS "Surveys readable by anon via token" ON public.surveys;
DROP POLICY IF EXISTS "Options readable by anon" ON public.survey_options;

-- 2) Secure RPC to fetch a survey + options by share_token (anon-callable)
CREATE OR REPLACE FUNCTION public.get_public_survey(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey public.surveys%ROWTYPE;
  v_options jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_survey
  FROM public.surveys
  WHERE share_token = _token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_survey.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.sort_order), '[]'::jsonb)
  INTO v_options
  FROM public.survey_options o
  WHERE o.survey_id = v_survey.id;

  RETURN jsonb_build_object(
    'survey', to_jsonb(v_survey),
    'options', v_options
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_survey(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_survey(text) TO anon, authenticated;

-- 3) Sales: restrict INSERT/UPDATE to admin roles
DROP POLICY IF EXISTS "Sales insertable by authenticated" ON public.sales_data;
DROP POLICY IF EXISTS "Sales updatable by authenticated" ON public.sales_data;

CREATE POLICY "Sales insertable by admin"
ON public.sales_data
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
);

CREATE POLICY "Sales updatable by admin"
ON public.sales_data
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
);
