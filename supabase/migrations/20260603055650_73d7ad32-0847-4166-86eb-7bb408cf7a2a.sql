
-- 1) Approvals: remove permissive OR-clause that exposed non-director records to all authenticated users
DROP POLICY IF EXISTS "Approvals viewable with director restriction" ON public.approvals;
CREATE POLICY "Approvals viewable by requester approver or admin"
ON public.approvals FOR SELECT
USING (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_step_approver(id, auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
);

-- 2) survey_votes: remove anon SELECT (voter_token must not be public). Keep authenticated SELECT.
DROP POLICY IF EXISTS "Votes readable by anon" ON public.survey_votes;

-- 3) notifications: prevent any authenticated user from injecting notifications into others' inboxes.
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- SECURITY DEFINER RPC for trusted cross-user notification sending (bypasses RLS, callable by any signed-in user)
CREATE OR REPLACE FUNCTION public.send_notifications(
  _user_ids uuid[],
  _title text,
  _message text,
  _type text DEFAULT 'general',
  _related_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  SELECT u, _type, _title, _message, _related_id
  FROM unnest(_user_ids) AS u
  WHERE u IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.send_notifications(uuid[], text, text, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_notifications(uuid[], text, text, text, uuid) TO authenticated;
