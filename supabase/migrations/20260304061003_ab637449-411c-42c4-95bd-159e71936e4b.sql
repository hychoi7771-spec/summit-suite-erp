
-- Add structured fields to meetings table
ALTER TABLE public.meetings
ADD COLUMN goal text,
ADD COLUMN achievement_status text DEFAULT 'in_progress',
ADD COLUMN achievement_comment text,
ADD COLUMN kpi_notes text,
ADD COLUMN roadmap_aligned boolean DEFAULT false,
ADD COLUMN schedule_adjustment_needed boolean DEFAULT false;

-- Create meeting_updates table for individual status updates
CREATE TABLE public.meeting_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  done text DEFAULT '',
  todo text DEFAULT '',
  blockers text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, profile_id)
);

ALTER TABLE public.meeting_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meeting updates viewable by authenticated"
ON public.meeting_updates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Meeting updates insertable by authenticated"
ON public.meeting_updates FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Meeting updates updatable by authenticated"
ON public.meeting_updates FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Meeting updates deletable by authenticated"
ON public.meeting_updates FOR DELETE TO authenticated
USING (true);
