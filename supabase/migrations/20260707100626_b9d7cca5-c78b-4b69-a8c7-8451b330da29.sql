
-- 1) approval_steps: prevent self-approval by requester when creating steps
DROP POLICY IF EXISTS "Steps insertable by requester or admin" ON public.approval_steps;
CREATE POLICY "Steps insertable by requester (no self-approval) or admin"
ON public.approval_steps FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.approvals a
      WHERE a.id = approval_steps.approval_id
        AND a.requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        AND a.status = 'pending'
    )
    AND approver_id NOT IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- 2) notifications: add WITH CHECK so users can't reassign notifications to others
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3) design-attachments: bucket is now private. Restrict SELECT to authenticated.
DROP POLICY IF EXISTS "design_attachments_select_all" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view design attachments" ON storage.objects;
CREATE POLICY "design_attachments_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'design-attachments');
