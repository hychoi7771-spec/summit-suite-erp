-- Allow admins (CEO, General Director) to delete approvals and approval steps
CREATE POLICY "Approvals deletable by admins"
ON public.approvals
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

CREATE POLICY "Steps deletable by admins"
ON public.approval_steps
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);