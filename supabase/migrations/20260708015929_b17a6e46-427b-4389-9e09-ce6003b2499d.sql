
-- 1) profiles: prevent user_id tampering by managers on UPDATE
CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'profiles.user_id는 변경할 수 없습니다.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_identity ON public.profiles;
CREATE TRIGGER trg_protect_profile_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

-- 2) storage: design-reviews — restrict INSERT/DELETE/UPDATE to owner or managers
DROP POLICY IF EXISTS "Design review files deletable by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Design review files uploadable by authenticated" ON storage.objects;

CREATE POLICY "Design review files uploadable by owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'design-reviews'
  AND owner = auth.uid()
);

CREATE POLICY "Design review files deletable by owner or manager"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'design-reviews'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  )
);

CREATE POLICY "Design review files updatable by owner or manager"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'design-reviews'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  )
)
WITH CHECK (bucket_id = 'design-reviews');

-- 3) storage: survey-images — restrict DELETE/UPDATE to owner or managers
DROP POLICY IF EXISTS "Survey images deletable by authenticated" ON storage.objects;

CREATE POLICY "Survey images deletable by owner or manager"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'survey-images'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  )
);

CREATE POLICY "Survey images updatable by owner or manager"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'survey-images'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  )
)
WITH CHECK (bucket_id = 'survey-images');
