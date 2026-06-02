
-- asset_files: admin UPDATE
CREATE POLICY "Assets updatable by admins"
ON public.asset_files FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

-- daily_logs: admin UPDATE / DELETE
CREATE POLICY "Logs updatable by admin"
ON public.daily_logs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

CREATE POLICY "Logs deletable by admin"
ON public.daily_logs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

-- daily_report_comments: admin UPDATE
CREATE POLICY "Daily report comments updatable by admin"
ON public.daily_report_comments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

-- daily_report_reactions: admin DELETE / UPDATE
CREATE POLICY "Reactions deletable by admin"
ON public.daily_report_reactions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

-- product_comments: admin UPDATE
CREATE POLICY "Product comments updatable by admin"
ON public.product_comments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

-- expenses: admin DELETE
CREATE POLICY "Expenses deletable by admin"
ON public.expenses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));

-- sales_data: admin DELETE
CREATE POLICY "Sales deletable by admin"
ON public.sales_data FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'general_director'::app_role));
