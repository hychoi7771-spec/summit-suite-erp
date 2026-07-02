
-- 1. 회의록 템플릿 테이블
CREATE TABLE public.meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT UNIQUE,  -- 회의 카테고리 자동 매칭 키 (NULL이면 매칭 안 함)
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{key,label,description,type:'text'|'textarea'|'list'}]
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_templates TO authenticated;
GRANT ALL ON public.meeting_templates TO service_role;

ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

-- 모든 로그인 사용자가 조회 가능
CREATE POLICY "authenticated can read templates"
  ON public.meeting_templates FOR SELECT
  TO authenticated USING (true);

-- 이사/대표/실장만 편집
CREATE POLICY "directors can insert templates"
  ON public.meeting_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
  );

CREATE POLICY "directors can update templates"
  ON public.meeting_templates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
  );

CREATE POLICY "directors can delete templates"
  ON public.meeting_templates FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
  );

CREATE TRIGGER meeting_templates_updated_at
  BEFORE UPDATE ON public.meeting_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. 회의 테이블에 템플릿 참조 컬럼 추가
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.meeting_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. 기본 "주간회의" 템플릿 시드
INSERT INTO public.meeting_templates (name, category, description, fields, is_default, sort_order)
VALUES (
  '주간회의 (Weekly)',
  '주간회의',
  '한 주 성과 복기 및 다음 주 목표 동기화를 위한 정기 회의 양식',
  '[
    {"key":"last_week_wins","label":"지난주 주요 성과","description":"지난주에 달성한 핵심 성과·수치·완료 업무를 bullet 형태로 요약","type":"textarea"},
    {"key":"this_week_goals","label":"이번 주 목표","description":"이번 주 팀 전체 및 개인별로 달성할 목표를 bullet 형태로 정리","type":"textarea"},
    {"key":"blockers","label":"장애물·리스크","description":"진행을 막고 있거나 임원 개입이 필요한 이슈 정리 (없으면 빈 문자열)","type":"textarea"},
    {"key":"kpi_snapshot","label":"핵심 지표 스냅샷","description":"매출·트래픽·전환율 등 언급된 KPI 수치 요약","type":"textarea"},
    {"key":"next_meeting_agenda","label":"다음 회의 안건","description":"다음 회의에서 논의할 안건이나 팔로업 항목","type":"textarea"}
  ]'::jsonb,
  true,
  0
);
