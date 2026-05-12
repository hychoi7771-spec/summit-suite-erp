-- approvals ↔ approval_steps 간 RLS 무한 순환 참조 버그 수정
-- approvals 정책에서 approval_steps를 참조하고,
-- approval_steps 정책에서 approvals를 참조하여 무한 재귀 발생

-- 1) 순환 참조가 있는 기존 정책 제거
DROP POLICY IF EXISTS "Approvals viewable with director restriction" ON public.approvals;
DROP POLICY IF EXISTS "Steps viewable with director restriction" ON public.approval_steps;

-- 2) approvals 정책 재생성 (approval_steps 참조 제거)
CREATE POLICY "Approvals viewable with director restriction"
ON public.approvals
FOR SELECT
TO authenticated
USING (
  -- 본인이 기안자
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  -- 본인이 현재 결재자
  OR current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  -- 관리자(대표/총괄이사)는 모두 열람
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  -- 기안자가 이사/대표가 아닐 때는 일반 열람 허용
  OR NOT public.profile_is_director(requester_id)
);

-- 3) approval_steps 정책 재생성 (approvals 참조 제거)
CREATE POLICY "Steps viewable with director restriction"
ON public.approval_steps
FOR SELECT
TO authenticated
USING (
  -- 본인이 결재자
  approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  -- 관리자
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
);
