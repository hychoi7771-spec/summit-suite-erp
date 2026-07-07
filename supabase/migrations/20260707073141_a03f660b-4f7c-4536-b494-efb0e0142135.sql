
-- ========== 1) tasks INSERT ownership binding ==========
DROP POLICY IF EXISTS "Tasks insertable by authenticated" ON public.tasks;
CREATE POLICY "Tasks insertable by authenticated"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ========== 2) meetings INSERT ownership binding ==========
DROP POLICY IF EXISTS "Meetings insertable by authenticated" ON public.meetings;
CREATE POLICY "Meetings insertable by authenticated"
ON public.meetings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ========== 3) products INSERT ownership binding ==========
DROP POLICY IF EXISTS "Products insertable by authenticated" ON public.products;
CREATE POLICY "Products insertable by authenticated"
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- ========== 4) task_links ownership restriction ==========
DROP POLICY IF EXISTS "Task links insertable by authenticated" ON public.task_links;
DROP POLICY IF EXISTS "Task links deletable by authenticated" ON public.task_links;

CREATE POLICY "Task links insertable by owner or admin"
ON public.task_links FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE t.id IN (source_task_id, target_task_id)
      AND t.assignee_id = p.id
  )
);

CREATE POLICY "Task links deletable by owner or admin"
ON public.task_links FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE t.id IN (source_task_id, target_task_id)
      AND t.assignee_id = p.id
  )
);

-- ========== 5) notifications: block direct client insert; only SECURITY DEFINER RPC ==========
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
-- No INSERT policy for authenticated. send_notifications() is SECURITY DEFINER and bypasses RLS.
REVOKE INSERT ON public.notifications FROM authenticated;
GRANT INSERT ON public.notifications TO service_role;

-- ========== 6) design-attachments storage folder ownership ==========
DROP POLICY IF EXISTS "design_attachments_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "design_attachments_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own design attachments" ON storage.objects;

CREATE POLICY "design_attachments_delete_owner_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'design-attachments'
  AND (
    split_part(name, '/', 1) IN (
      SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
  )
);

CREATE POLICY "design_attachments_update_owner_or_admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'design-attachments'
  AND (
    split_part(name, '/', 1) IN (
      SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
  )
);
