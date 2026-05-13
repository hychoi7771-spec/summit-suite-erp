
-- Fix infinite recursion between approvals and approval_steps SELECT policies
-- by wrapping cross-table lookups in SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION public.is_step_approver(_approval_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approval_steps s
    JOIN public.profiles p ON p.id = s.approver_id
    WHERE s.approval_id = _approval_id
      AND p.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.approval_meta(_approval_id uuid)
RETURNS TABLE(requester_id uuid, current_approver_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT requester_id, current_approver_id FROM public.approvals WHERE id = _approval_id;
$$;

CREATE OR REPLACE FUNCTION public.can_view_approval(_approval_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = _approval_id
      AND (
        a.requester_id IN (SELECT id FROM public.profiles WHERE user_id = _user_id)
        OR a.current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = _user_id)
        OR public.has_role(_user_id, 'ceo'::app_role)
        OR public.has_role(_user_id, 'general_director'::app_role)
        OR NOT public.profile_is_director(a.requester_id)
      )
  );
$$;

-- Replace approvals SELECT policy (remove EXISTS on approval_steps -> use sec definer)
DROP POLICY IF EXISTS "Approvals viewable with director restriction" ON public.approvals;
CREATE POLICY "Approvals viewable with director restriction"
ON public.approvals
FOR SELECT
TO authenticated
USING (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_step_approver(id, auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR NOT public.profile_is_director(requester_id)
);

-- Replace approval_steps SELECT policy (remove EXISTS on approvals -> use sec definer)
DROP POLICY IF EXISTS "Steps viewable with director restriction" ON public.approval_steps;
CREATE POLICY "Steps viewable with director restriction"
ON public.approval_steps
FOR SELECT
TO authenticated
USING (
  approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.can_view_approval(approval_id, auth.uid())
);
