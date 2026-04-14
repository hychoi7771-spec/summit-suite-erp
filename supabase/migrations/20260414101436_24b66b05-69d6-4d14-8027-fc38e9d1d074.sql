
CREATE TABLE public.daily_report_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.daily_work_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id, emoji_code)
);

ALTER TABLE public.daily_report_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by authenticated"
  ON public.daily_report_reactions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Reactions insertable by authenticated"
  ON public.daily_report_reactions FOR INSERT
  TO authenticated WITH CHECK (
    user_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Reactions deletable by owner"
  ON public.daily_report_reactions FOR DELETE
  TO authenticated USING (
    user_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  );

CREATE INDEX idx_daily_report_reactions_report ON public.daily_report_reactions(report_id);
