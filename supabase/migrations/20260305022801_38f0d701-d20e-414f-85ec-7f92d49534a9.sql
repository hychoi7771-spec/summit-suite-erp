CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'general_director'::app_role)
);