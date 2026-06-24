
-- approvals
DROP POLICY IF EXISTS "Approvals insertable by authenticated" ON public.approvals;
CREATE POLICY "Approvals insertable by requester" ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Approvals deletable by admin or requester pending" ON public.approvals;
CREATE POLICY "Approvals deletable by admin or requester pending" ON public.approvals
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR (has_role(auth.uid(), 'managing_director'::app_role) AND type = 'leave'::approval_type)
    OR (status = 'pending'::approval_status AND requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  );

-- calendar_events
DROP POLICY IF EXISTS "Calendar events insertable by authenticated" ON public.calendar_events;
CREATE POLICY "Calendar events insertable by creator" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Calendar events deletable by creator or manager" ON public.calendar_events;
CREATE POLICY "Calendar events deletable by creator or manager" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- design_reviews
DROP POLICY IF EXISTS "Design reviews insertable by authenticated" ON public.design_reviews;
CREATE POLICY "Design reviews insertable by uploader" ON public.design_reviews
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- surveys
DROP POLICY IF EXISTS "Surveys insertable by authenticated" ON public.surveys;
CREATE POLICY "Surveys insertable by creator" ON public.surveys
  FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- project_folders
DROP POLICY IF EXISTS "Folders insertable by authenticated" ON public.project_folders;
CREATE POLICY "Folders insertable by creator" ON public.project_folders
  FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- asset_files
DROP POLICY IF EXISTS "Assets insertable by authenticated" ON public.asset_files;
CREATE POLICY "Assets insertable by uploader" ON public.asset_files
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- notices
DROP POLICY IF EXISTS "Notices insertable by authenticated" ON public.notices;
CREATE POLICY "Notices insertable by author" ON public.notices
  FOR INSERT TO authenticated
  WITH CHECK (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Notices deletable by author or admin" ON public.notices;
CREATE POLICY "Notices deletable by author or admin" ON public.notices
  FOR DELETE TO authenticated
  USING (
    author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR (SELECT id FROM public.profiles WHERE user_id = auth.uid()) = '352c4d35-3f3b-4f94-b7bd-f4c18762bfaf'::uuid
  );

DROP POLICY IF EXISTS "Notices updatable by author or admin" ON public.notices;
CREATE POLICY "Notices updatable by author or admin" ON public.notices
  FOR UPDATE TO authenticated
  USING (
    author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR (SELECT id FROM public.profiles WHERE user_id = auth.uid()) = '352c4d35-3f3b-4f94-b7bd-f4c18762bfaf'::uuid
  );

-- expenses
DROP POLICY IF EXISTS "Expenses insertable by authenticated" ON public.expenses;
CREATE POLICY "Expenses insertable by submitter" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- task_comments: remove duplicate permissive policy
DROP POLICY IF EXISTS "Task comments insertable by authenticated" ON public.task_comments;

-- task_history
DROP POLICY IF EXISTS "Task history insertable by authenticated" ON public.task_history;
CREATE POLICY "Task history insertable by owner" ON public.task_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- cost_analysis: restrict insert to senior roles
DROP POLICY IF EXISTS "Cost analysis insertable by authenticated" ON public.cost_analysis;
CREATE POLICY "Cost analysis insertable by senior" ON public.cost_analysis
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- cost_versions: restrict insert to senior roles
DROP POLICY IF EXISTS "Cost versions insertable by authenticated" ON public.cost_versions;
CREATE POLICY "Cost versions insertable by senior" ON public.cost_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- leave_balances: re-scope roles {public}->{authenticated}
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, cmd, qual, with_check
           FROM pg_policies
           WHERE schemaname='public' AND tablename='leave_balances' AND 'public' = ANY(roles)
           AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_balances', r.policyname);
    IF r.cmd = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.leave_balances FOR INSERT TO authenticated WITH CHECK (%s)', r.policyname, COALESCE(r.with_check,'true'));
    ELSIF r.cmd = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON public.leave_balances FOR UPDATE TO authenticated USING (%s)%s', r.policyname, COALESCE(r.qual,'true'),
        CASE WHEN r.with_check IS NOT NULL THEN format(' WITH CHECK (%s)', r.with_check) ELSE '' END);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.leave_balances FOR DELETE TO authenticated USING (%s)', r.policyname, COALESCE(r.qual,'true'));
    END IF;
  END LOOP;
END $$;

-- leave_requests: re-scope UPDATE/DELETE roles {public}->{authenticated}
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, cmd, qual, with_check
           FROM pg_policies
           WHERE schemaname='public' AND tablename='leave_requests' AND 'public' = ANY(roles)
           AND cmd IN ('UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_requests', r.policyname);
    IF r.cmd = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON public.leave_requests FOR UPDATE TO authenticated USING (%s)%s', r.policyname, COALESCE(r.qual,'true'),
        CASE WHEN r.with_check IS NOT NULL THEN format(' WITH CHECK (%s)', r.with_check) ELSE '' END);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.leave_requests FOR DELETE TO authenticated USING (%s)', r.policyname, COALESCE(r.qual,'true'));
    END IF;
  END LOOP;
END $$;
