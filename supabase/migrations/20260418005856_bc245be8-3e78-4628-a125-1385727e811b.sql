
-- 휴가 잔액: 부장급도 추가/수정/삭제 가능
DROP POLICY IF EXISTS "Leave balances insertable by admin" ON public.leave_balances;
DROP POLICY IF EXISTS "Leave balances updatable by admin or system" ON public.leave_balances;
DROP POLICY IF EXISTS "Leave balances deletable by admin" ON public.leave_balances;

CREATE POLICY "Leave balances insertable by manager"
ON public.leave_balances FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role) 
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE POLICY "Leave balances updatable by manager or self"
ON public.leave_balances FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role) 
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
  OR (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Leave balances deletable by manager"
ON public.leave_balances FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role) 
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

-- 프로필(입사일 등): 부장급도 다른 직원 정보 수정 가능
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or manager updates any"
ON public.profiles FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);

-- 휴가 신청: 부장급은 다른 직원 신청도 승인/취소 가능
DROP POLICY IF EXISTS "Leave requests updatable by self or admin" ON public.leave_requests;
CREATE POLICY "Leave requests updatable by self or manager"
ON public.leave_requests FOR UPDATE TO authenticated
USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR has_role(auth.uid(), 'deputy_gm'::app_role)
);
