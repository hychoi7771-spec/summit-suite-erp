
ALTER TABLE public.daily_work_reports 
  ADD COLUMN IF NOT EXISTS director_comment text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ceo_comment text DEFAULT NULL;
