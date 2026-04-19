-- 루틴 업무 템플릿 테이블
CREATE TABLE public.routine_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'weekly' | 'monthly'
  weekdays INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=일, 1=월, ... 6=토 (weekly에서 사용)
  month_day INTEGER, -- 1~31 (monthly에서 사용)
  estimated_minutes INTEGER DEFAULT 0,
  time_of_day TEXT DEFAULT 'morning', -- 'morning' | 'afternoon' | 'evening' | 'anytime'
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routine_templates_user ON public.routine_templates(user_id, is_active);

ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;

-- 본인 또는 관리자(ceo/general_director/deputy_gm) 관리
CREATE POLICY "Routine templates viewable by authenticated"
ON public.routine_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Routine templates insertable by self or manager"
ON public.routine_templates FOR INSERT TO authenticated
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE POLICY "Routine templates updatable by self or manager"
ON public.routine_templates FOR UPDATE TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE POLICY "Routine templates deletable by self or manager"
ON public.routine_templates FOR DELETE TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE TRIGGER trg_routine_templates_updated_at
BEFORE UPDATE ON public.routine_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 루틴 일별 완료 기록
CREATE TABLE public.routine_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.routine_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'carry_over' | 'skipped'
  skip_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, date)
);

CREATE INDEX idx_routine_completions_user_date ON public.routine_completions(user_id, date);

ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Routine completions viewable by authenticated"
ON public.routine_completions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Routine completions insertable by self or manager"
ON public.routine_completions FOR INSERT TO authenticated
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE POLICY "Routine completions updatable by self or manager"
ON public.routine_completions FOR UPDATE TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE POLICY "Routine completions deletable by self or manager"
ON public.routine_completions FOR DELETE TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
);

CREATE TRIGGER trg_routine_completions_updated_at
BEFORE UPDATE ON public.routine_completions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();