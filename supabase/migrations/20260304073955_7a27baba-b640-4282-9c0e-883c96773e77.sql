
-- Custom calendar events that any team member can create
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  color TEXT DEFAULT 'primary',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar events viewable by authenticated"
ON public.calendar_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Calendar events insertable by authenticated"
ON public.calendar_events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Calendar events updatable by creator or admin"
ON public.calendar_events FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);

CREATE POLICY "Calendar events deletable by creator or admin"
ON public.calendar_events FOR DELETE
TO authenticated
USING (
  created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo')
  OR has_role(auth.uid(), 'general_director')
);

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
