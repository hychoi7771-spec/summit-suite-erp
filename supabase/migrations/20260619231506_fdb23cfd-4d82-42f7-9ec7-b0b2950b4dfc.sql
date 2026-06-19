
DROP POLICY IF EXISTS "Steps insertable by authenticated" ON public.approval_steps;
CREATE POLICY "Steps insertable by requester or admin"
ON public.approval_steps FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = approval_steps.approval_id
      AND a.requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Cost analysis updatable by authenticated" ON public.cost_analysis;
CREATE POLICY "Cost analysis updatable by admin"
ON public.cost_analysis FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

DROP POLICY IF EXISTS "Cost versions updatable by authenticated" ON public.cost_versions;
CREATE POLICY "Cost versions updatable by admin"
ON public.cost_versions FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

DROP POLICY IF EXISTS "Annotations insertable by authenticated" ON public.design_annotations;
CREATE POLICY "Annotations insertable by owner"
ON public.design_annotations FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Review comments insertable by authenticated" ON public.design_review_comments;
CREATE POLICY "Review comments insertable by owner"
ON public.design_review_comments FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Meeting updates insertable by authenticated" ON public.meeting_updates;
CREATE POLICY "Meeting updates insertable by owner"
ON public.meeting_updates FOR INSERT TO authenticated
WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Meeting updates updatable by authenticated" ON public.meeting_updates;
CREATE POLICY "Meeting updates updatable by owner or admin"
ON public.meeting_updates FOR UPDATE TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
)
WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

DROP POLICY IF EXISTS "Meeting updates deletable by authenticated" ON public.meeting_updates;
CREATE POLICY "Meeting updates deletable by owner or admin"
ON public.meeting_updates FOR DELETE TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

DROP POLICY IF EXISTS "Comments insertable by authenticated" ON public.product_comments;
CREATE POLICY "Product comments insertable by owner"
ON public.product_comments FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Products updatable by authenticated" ON public.products;
CREATE POLICY "Products updatable by assignee participant or admin"
ON public.products FOR UPDATE TO authenticated
USING (
  assignee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR (SELECT id FROM public.profiles WHERE user_id = auth.uid()) = ANY(participant_ids)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
)
WITH CHECK (
  assignee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR (SELECT id FROM public.profiles WHERE user_id = auth.uid()) = ANY(participant_ids)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

DROP POLICY IF EXISTS "Comments insertable by authenticated" ON public.task_comments;
CREATE POLICY "Task comments insertable by owner"
ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
