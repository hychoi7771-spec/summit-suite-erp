-- 이사/대표가 기안한 결재 건은 사원이 보지 못하도록 SELECT 정책 제한
-- 헬퍼: 특정 프로필이 ceo/general_director 역할인지 확인
CREATE OR REPLACE FUNCTION public.profile_is_director(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.id = _profile_id
      AND ur.role IN ('ceo', 'general_director')
  )
$$;

-- approvals SELECT 정책 교체
DROP POLICY IF EXISTS "Approvals viewable by authenticated" ON public.approvals;

CREATE POLICY "Approvals viewable with director restriction"
ON public.approvals
FOR SELECT
TO authenticated
USING (
  -- 본인이 기안자
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  -- 본인이 현재 결재자
  OR current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  -- 결재 라인의 결재자
  OR EXISTS (
    SELECT 1 FROM public.approval_steps s
    WHERE s.approval_id = approvals.id
      AND s.approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  -- 관리자(대표/총괄이사)는 모두 열람
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  -- 그 외 케이스: 기안자가 이사/대표가 아닐 때만 일반 열람 허용
  OR NOT public.profile_is_director(requester_id)
);

-- approval_steps SELECT 정책도 동일 원칙으로 교체
DROP POLICY IF EXISTS "Steps viewable by authenticated" ON public.approval_steps;

CREATE POLICY "Steps viewable with director restriction"
ON public.approval_steps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = approval_steps.approval_id
      AND (
        a.requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR a.current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR approval_steps.approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'ceo'::app_role)
        OR public.has_role(auth.uid(), 'general_director'::app_role)
        OR NOT public.profile_is_director(a.requester_id)
      )
  )
);