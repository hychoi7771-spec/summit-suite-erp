
-- leave_requests: 실장(managing_director)에게 수정/삭제 권한 부여
DROP POLICY IF EXISTS "Leave requests updatable by self or manager" ON public.leave_requests;
CREATE POLICY "Leave requests updatable by self or manager"
ON public.leave_requests FOR UPDATE
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

DROP POLICY IF EXISTS "Leave requests deletable by self or manager" ON public.leave_requests;
CREATE POLICY "Leave requests deletable by self or manager"
ON public.leave_requests FOR DELETE
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

-- leave_balances: 실장 수정/삭제 허용
DROP POLICY IF EXISTS "Leave balances updatable by manager or self" ON public.leave_balances;
CREATE POLICY "Leave balances updatable by manager or self"
ON public.leave_balances FOR UPDATE
USING (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Leave balances deletable by manager" ON public.leave_balances;
CREATE POLICY "Leave balances deletable by manager"
ON public.leave_balances FOR DELETE
USING (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

-- leave_balances INSERT 정책 확인 후 갱신
DROP POLICY IF EXISTS "Leave balances insertable by manager" ON public.leave_balances;
CREATE POLICY "Leave balances insertable by manager"
ON public.leave_balances FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- calendar_events: 실장도 휴가 캘린더 이벤트 삭제 가능
DROP POLICY IF EXISTS "Calendar events deletable by creator or manager" ON public.calendar_events;
CREATE POLICY "Calendar events deletable by creator or manager"
ON public.calendar_events FOR DELETE
USING (
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

-- approvals: 실장도 휴가 결재 레코드 삭제 가능 (휴가 신청 삭제 시 연결된 결재 정리)
DROP POLICY IF EXISTS "Approvals deletable by admin or requester pending" ON public.approvals;
CREATE POLICY "Approvals deletable by admin or requester pending"
ON public.approvals FOR DELETE
USING (
  public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR (
    public.has_role(auth.uid(), 'managing_director'::app_role)
    AND type = 'leave'
  )
  OR (status = 'pending'::approval_status
      AND requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);
