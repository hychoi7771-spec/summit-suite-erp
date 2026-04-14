
-- Daily work reports table
CREATE TABLE public.daily_work_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  morning_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  director_approved BOOLEAN NOT NULL DEFAULT false,
  director_approved_by UUID REFERENCES public.profiles(id),
  director_approved_at TIMESTAMPTZ,
  ceo_approved BOOLEAN NOT NULL DEFAULT false,
  ceo_approved_by UUID REFERENCES public.profiles(id),
  ceo_approved_at TIMESTAMPTZ,
  ceo_stamp_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_work_reports ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view reports
CREATE POLICY "Authenticated users can view daily work reports"
ON public.daily_work_reports FOR SELECT TO authenticated
USING (true);

-- Users can insert their own reports
CREATE POLICY "Users can insert own daily work reports"
ON public.daily_work_reports FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Users can update own reports; admins can update any
CREATE POLICY "Users and admins can update daily work reports"
ON public.daily_work_reports FOR UPDATE TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo')
  OR public.has_role(auth.uid(), 'general_director')
);

-- Users can delete own reports
CREATE POLICY "Users can delete own daily work reports"
ON public.daily_work_reports FOR DELETE TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
