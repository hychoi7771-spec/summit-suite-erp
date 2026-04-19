-- 공지 게시판 관리자 권한 확장: 대표/이사 + 공경미 실장 프로필
-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Notices updatable by author or admin" ON public.notices;
DROP POLICY IF EXISTS "Notices deletable by author or admin" ON public.notices;

CREATE POLICY "Notices updatable by author or admin"
ON public.notices
FOR UPDATE
USING (
  (author_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
       = '352c4d35-3f3b-4f94-b7bd-f4c18762bfaf'::uuid
);

CREATE POLICY "Notices deletable by author or admin"
ON public.notices
FOR DELETE
USING (
  (author_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
  OR (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
       = '352c4d35-3f3b-4f94-b7bd-f4c18762bfaf'::uuid
);