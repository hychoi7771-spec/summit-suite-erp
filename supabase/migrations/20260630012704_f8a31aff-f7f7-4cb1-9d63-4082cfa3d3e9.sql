
-- 1. stock_alert_shipments: re-scope all policies to authenticated only
DROP POLICY IF EXISTS shipments_select_all ON public.stock_alert_shipments;
DROP POLICY IF EXISTS shipments_insert_authorized ON public.stock_alert_shipments;
DROP POLICY IF EXISTS shipments_update_authorized ON public.stock_alert_shipments;
DROP POLICY IF EXISTS shipments_delete_authorized ON public.stock_alert_shipments;

CREATE POLICY shipments_select_all ON public.stock_alert_shipments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY shipments_insert_authorized ON public.stock_alert_shipments
  FOR INSERT TO authenticated
  WITH CHECK (
    (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    AND (
      created_by = 'e9fe0398-346d-4930-831a-0ed5c1b9c539'::uuid
      OR has_role(auth.uid(), 'ceo'::app_role)
      OR has_role(auth.uid(), 'general_director'::app_role)
      OR has_role(auth.uid(), 'managing_director'::app_role)
    )
  );

CREATE POLICY shipments_update_authorized ON public.stock_alert_shipments
  FOR UPDATE TO authenticated
  USING (
    (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
  );

CREATE POLICY shipments_delete_authorized ON public.stock_alert_shipments
  FOR DELETE TO authenticated
  USING (
    (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
  );

-- 2. approvals: scope SELECT policy to authenticated
DROP POLICY IF EXISTS "Approvals viewable by requester approver or admin" ON public.approvals;
CREATE POLICY "Approvals viewable by requester approver or admin" ON public.approvals
  FOR SELECT TO authenticated
  USING (
    (requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR (current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR is_step_approver(id, auth.uid())
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
  );

-- 3. survey_options: require ownership of parent survey (or executives)
DROP POLICY IF EXISTS "Options insertable by authenticated" ON public.survey_options;
DROP POLICY IF EXISTS "Options updatable by authenticated" ON public.survey_options;
DROP POLICY IF EXISTS "Options deletable by authenticated" ON public.survey_options;

CREATE POLICY "Options insertable by survey owner" ON public.survey_options
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_options.survey_id
        AND (
          s.created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          OR has_role(auth.uid(), 'ceo'::app_role)
          OR has_role(auth.uid(), 'general_director'::app_role)
        )
    )
  );

CREATE POLICY "Options updatable by survey owner" ON public.survey_options
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_options.survey_id
        AND (
          s.created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          OR has_role(auth.uid(), 'ceo'::app_role)
          OR has_role(auth.uid(), 'general_director'::app_role)
        )
    )
  );

CREATE POLICY "Options deletable by survey owner" ON public.survey_options
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_options.survey_id
        AND (
          s.created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          OR has_role(auth.uid(), 'ceo'::app_role)
          OR has_role(auth.uid(), 'general_director'::app_role)
        )
    )
  );
