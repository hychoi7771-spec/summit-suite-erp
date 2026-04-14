
-- Restrict meetings UPDATE to attendees and admins only
DROP POLICY IF EXISTS "Meetings updatable by authenticated" ON public.meetings;

CREATE POLICY "Meetings updatable by attendee or admin"
ON public.meetings FOR UPDATE TO authenticated
USING (
  (
    (SELECT id FROM profiles WHERE user_id = auth.uid()) = ANY(attendee_ids)
  )
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);
