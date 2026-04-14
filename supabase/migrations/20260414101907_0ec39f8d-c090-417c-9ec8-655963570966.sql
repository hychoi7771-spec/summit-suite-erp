
CREATE TABLE public.daily_report_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.daily_work_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON public.daily_report_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Comments insertable by authenticated"
  ON public.daily_report_comments FOR INSERT
  TO authenticated WITH CHECK (
    user_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Comments deletable by owner or admin"
  ON public.daily_report_comments FOR DELETE
  TO authenticated USING (
    user_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo')
    OR has_role(auth.uid(), 'general_director')
  );

CREATE INDEX idx_daily_report_comments_report ON public.daily_report_comments(report_id);
