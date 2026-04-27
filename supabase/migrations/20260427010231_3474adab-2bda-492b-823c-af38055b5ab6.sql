-- 기안자가 승인 전(pending 상태)에 본인 결재를 삭제할 수 있도록 정책 추가
DROP POLICY IF EXISTS "Approvals deletable by admins" ON public.approvals;
CREATE POLICY "Approvals deletable by admin or requester pending"
ON public.approvals
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR (
    status = 'pending'
    AND requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- 결재 단계도 동일하게: admin 또는 (pending 상태인 결재의 기안자)
DROP POLICY IF EXISTS "Steps deletable by admins" ON public.approval_steps;
CREATE POLICY "Steps deletable by admin or requester pending"
ON public.approval_steps
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = approval_steps.approval_id
      AND a.status = 'pending'
      AND a.requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);