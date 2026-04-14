-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Tasks updatable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks deletable by authenticated" ON public.tasks;

-- Assignee or admin can update
CREATE POLICY "Tasks updatable by assignee or admin"
ON public.tasks FOR UPDATE TO authenticated
USING (
  assignee_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);

-- Assignee can delete own, admins can delete all
CREATE POLICY "Tasks deletable by assignee or admin"
ON public.tasks FOR DELETE TO authenticated
USING (
  assignee_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'general_director'::app_role)
);