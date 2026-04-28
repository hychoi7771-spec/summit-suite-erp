
-- 1) leave_requests 삭제 권한에 deputy_gm 추가
DROP POLICY IF EXISTS "Leave requests deletable by self or admin" ON public.leave_requests;
CREATE POLICY "Leave requests deletable by self or manager"
ON public.leave_requests
FOR DELETE
TO authenticated
USING (
  (user_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

-- 2) calendar_events: deputy_gm도 모든 일정 수정/삭제 가능 (휴가 자동 생성 일정 관리용)
DROP POLICY IF EXISTS "Calendar events updatable by creator or admin" ON public.calendar_events;
CREATE POLICY "Calendar events updatable by creator or manager"
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  (created_by = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

DROP POLICY IF EXISTS "Calendar events deletable by creator or admin" ON public.calendar_events;
CREATE POLICY "Calendar events deletable by creator or manager"
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  (created_by = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);
