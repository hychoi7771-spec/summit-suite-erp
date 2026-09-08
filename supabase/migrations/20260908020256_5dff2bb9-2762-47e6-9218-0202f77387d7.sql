ALTER TYPE approval_type ADD VALUE IF NOT EXISTS 'trip';

CREATE TABLE public.business_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination text NOT NULL,
  purpose text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  transport text,
  companions text,
  accommodation boolean NOT NULL DEFAULT false,
  estimated_cost integer,
  note text,
  status approval_status NOT NULL DEFAULT 'pending',
  approval_id uuid REFERENCES public.approvals(id) ON DELETE SET NULL,
  calendar_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_trips TO authenticated;
GRANT ALL ON public.business_trips TO service_role;

ALTER TABLE public.business_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view business trips"
  ON public.business_trips FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own business trips"
  ON public.business_trips FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Owner or director can update business trips"
  ON public.business_trips FOR UPDATE TO authenticated
  USING (
    (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND status = 'pending')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
  );

CREATE POLICY "Owner or director can delete business trips"
  ON public.business_trips FOR DELETE TO authenticated
  USING (
    (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND status = 'pending')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
  );

CREATE TRIGGER update_business_trips_updated_at
  BEFORE UPDATE ON public.business_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 결재 승인/반려 시 출장 상태 동기화
CREATE OR REPLACE FUNCTION public.sync_trip_from_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type::text = 'trip' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.business_trips
        SET status = 'approved',
            approved_by = NEW.current_approver_id,
            approved_at = COALESCE(NEW.approved_at, now())
        WHERE approval_id = NEW.id AND status <> 'approved';
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.business_trips
        SET status = 'rejected'
        WHERE approval_id = NEW.id AND status <> 'rejected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_trip_from_approval_trg
  AFTER UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.sync_trip_from_approval();

-- 승인된 출장은 통합 캘린더에 자동 등록, 반려 시 삭제
CREATE OR REPLACE FUNCTION public.handle_trip_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_name text;
BEGIN
  IF NEW.status = 'approved' AND NEW.calendar_event_id IS NULL THEN
    SELECT name_kr INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.calendar_events (title, description, date, start_time, end_time, color, created_by)
    VALUES (
      '[출장] ' || COALESCE(v_name, '') || ' - ' || NEW.destination,
      COALESCE(NEW.purpose, ''),
      NEW.start_date,
      NEW.start_time,
      NEW.end_time,
      '#0891b2',
      NEW.user_id
    )
    RETURNING id INTO v_event_id;
    NEW.calendar_event_id := v_event_id;
  ELSIF NEW.status = 'rejected' AND NEW.calendar_event_id IS NOT NULL THEN
    DELETE FROM public.calendar_events WHERE id = NEW.calendar_event_id;
    NEW.calendar_event_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_trip_calendar_trg
  BEFORE INSERT OR UPDATE OF status ON public.business_trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_calendar();