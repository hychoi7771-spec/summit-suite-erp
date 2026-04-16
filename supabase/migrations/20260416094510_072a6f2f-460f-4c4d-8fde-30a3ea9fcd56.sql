
DROP POLICY "Users can delete own daily work reports" ON public.daily_work_reports;

CREATE POLICY "Users and admins can delete daily work reports"
  ON public.daily_work_reports
  FOR DELETE
  TO authenticated
  USING (
    (user_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
  );
