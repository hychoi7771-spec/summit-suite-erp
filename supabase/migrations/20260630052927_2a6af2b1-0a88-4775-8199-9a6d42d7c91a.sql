
-- 1) Approval attachments storage policies
DROP POLICY IF EXISTS "Authenticated users can upload approval attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update approval attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete approval attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read approval attachments" ON storage.objects;

CREATE POLICY "approval_attachments_insert_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'approval-attachments'
  AND split_part(name, '/', 1) IN (
    SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "approval_attachments_select_authorized"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'approval-attachments'
  AND (
    split_part(name, '/', 1) IN (SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.approvals a
      WHERE EXISTS (
        SELECT 1 FROM unnest(COALESCE(a.attachment_urls, ARRAY[]::text[])) u
        WHERE u LIKE '%' || storage.objects.name
      )
      AND public.can_view_approval(a.id, auth.uid())
    )
  )
);

CREATE POLICY "approval_attachments_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'approval-attachments'
  AND (
    split_part(name, '/', 1) IN (SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
  )
);

CREATE POLICY "approval_attachments_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'approval-attachments'
  AND (
    split_part(name, '/', 1) IN (SELECT p.id::text FROM public.profiles p WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
  )
);

-- 2) Replace hardcoded-UUID policies with role-based checks
DROP POLICY IF EXISTS stock_alerts_insert_authorized ON public.stock_urgent_alerts;
CREATE POLICY stock_alerts_insert_authorized
ON public.stock_urgent_alerts FOR INSERT TO authenticated
WITH CHECK (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
    OR public.has_role(auth.uid(), 'assistant_manager'::app_role)
  )
);

DROP POLICY IF EXISTS shipments_insert_authorized ON public.stock_alert_shipments;
CREATE POLICY shipments_insert_authorized
ON public.stock_alert_shipments FOR INSERT TO authenticated
WITH CHECK (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
    OR public.has_role(auth.uid(), 'assistant_manager'::app_role)
  )
);
