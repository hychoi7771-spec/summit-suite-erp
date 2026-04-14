CREATE POLICY "Meetings deletable by admin"
ON public.meetings
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'general_director'::app_role)
);