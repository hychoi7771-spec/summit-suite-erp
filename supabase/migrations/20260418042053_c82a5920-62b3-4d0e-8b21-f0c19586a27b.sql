-- 사내 휴무일 테이블
CREATE TABLE public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'orange',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, name)
);

CREATE INDEX idx_company_holidays_date ON public.company_holidays(date);

ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- 모든 로그인 사용자 조회
CREATE POLICY "Company holidays viewable by authenticated"
  ON public.company_holidays FOR SELECT
  TO authenticated USING (true);

-- 대표/총괄이사/차장만 등록
CREATE POLICY "Company holidays insertable by manager"
  ON public.company_holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- 대표/총괄이사/차장만 수정
CREATE POLICY "Company holidays updatable by manager"
  ON public.company_holidays FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- 대표/총괄이사/차장만 삭제
CREATE POLICY "Company holidays deletable by manager"
  ON public.company_holidays FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- updated_at 트리거
CREATE TRIGGER company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();