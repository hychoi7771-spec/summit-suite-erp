-- Allow users to delete their own notifications (for auto-delete on read)
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'general_director'::app_role));