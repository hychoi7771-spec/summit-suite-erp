
-- 1) Restrict cost / price policy visibility to managers only
DROP POLICY IF EXISTS "Cost analysis viewable by authenticated" ON public.cost_analysis;
CREATE POLICY "Cost analysis viewable by managers"
  ON public.cost_analysis FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

DROP POLICY IF EXISTS "Cost versions viewable by authenticated" ON public.cost_versions;
CREATE POLICY "Cost versions viewable by managers"
  ON public.cost_versions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

DROP POLICY IF EXISTS "price policies viewable by authenticated" ON public.channel_price_policies;
CREATE POLICY "price policies viewable by managers"
  ON public.channel_price_policies FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- 2) Tighten promotions INSERT: require manager role OR owner (created_by / md_id maps to caller's profile)
DROP POLICY IF EXISTS "promotions insertable by authenticated" ON public.promotions;
CREATE POLICY "promotions insertable by manager or owner"
  ON public.promotions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
    OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR md_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 3) Enforce notifications.user_id references an actual auth user (not a profile.id).
CREATE OR REPLACE FUNCTION public.validate_notification_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'notifications.user_id는 필수입니다.' USING ERRCODE = '23502';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'notifications.user_id must reference an auth user (profiles.user_id). Received value % does not match any auth user.', NEW.user_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_notification_user_id ON public.notifications;
CREATE TRIGGER trg_validate_notification_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_notification_user_id();
