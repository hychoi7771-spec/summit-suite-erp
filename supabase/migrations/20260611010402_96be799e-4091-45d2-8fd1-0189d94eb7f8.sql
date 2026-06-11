CREATE OR REPLACE FUNCTION public.can_view_approval(_approval_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = _approval_id
      AND (
        a.requester_id IN (SELECT id FROM public.profiles WHERE user_id = _user_id)
        OR a.current_approver_id IN (SELECT id FROM public.profiles WHERE user_id = _user_id)
        OR EXISTS (
          SELECT 1 FROM public.approval_steps s
          JOIN public.profiles p ON p.id = s.approver_id
          WHERE s.approval_id = a.id AND p.user_id = _user_id
        )
        OR public.has_role(_user_id, 'ceo'::app_role)
        OR public.has_role(_user_id, 'general_director'::app_role)
      )
  );
$function$;