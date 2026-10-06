CREATE OR REPLACE FUNCTION public.handle_trip_calendar()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
  v_name text;
  v_title text;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT name_kr INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    v_title := '[출장] ' || COALESCE(v_name, '') || ' - ' || NEW.destination;
    IF NEW.calendar_event_id IS NULL THEN
      INSERT INTO public.calendar_events (title, description, date, start_time, end_time, color, created_by)
      VALUES (v_title, COALESCE(NEW.purpose, ''), NEW.start_date, NEW.start_time, NEW.end_time, '#0891b2', NEW.user_id)
      RETURNING id INTO v_event_id;
      NEW.calendar_event_id := v_event_id;
    ELSE
      UPDATE public.calendar_events
         SET title = v_title, description = COALESCE(NEW.purpose, ''),
             date = NEW.start_date, start_time = NEW.start_time, end_time = NEW.end_time
       WHERE id = NEW.calendar_event_id;
    END IF;
  ELSIF NEW.calendar_event_id IS NOT NULL THEN
    DELETE FROM public.calendar_events WHERE id = NEW.calendar_event_id;
    NEW.calendar_event_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS handle_trip_calendar_trg ON public.business_trips;
CREATE TRIGGER handle_trip_calendar_trg BEFORE INSERT OR UPDATE ON public.business_trips
FOR EACH ROW EXECUTE FUNCTION public.handle_trip_calendar();

CREATE OR REPLACE FUNCTION public.handle_trip_delete_calendar()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.calendar_event_id IS NOT NULL THEN
    DELETE FROM public.calendar_events WHERE id = OLD.calendar_event_id;
  END IF;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER handle_trip_delete_calendar_trg AFTER DELETE ON public.business_trips
FOR EACH ROW EXECUTE FUNCTION public.handle_trip_delete_calendar();

-- Clean up existing orphaned trip events
DELETE FROM public.calendar_events ce
 WHERE ce.title LIKE '[출장]%'
   AND NOT EXISTS (SELECT 1 FROM public.business_trips bt WHERE bt.calendar_event_id = ce.id);