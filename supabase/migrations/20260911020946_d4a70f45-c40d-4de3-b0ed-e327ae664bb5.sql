CREATE OR REPLACE FUNCTION public.handle_leave_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
  v_user_name TEXT;
  v_color TEXT;
  v_hire_date DATE;
  v_is_sub_year BOOLEAN := false;
  v_label TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT name_kr, hire_date INTO v_user_name, v_hire_date
      FROM public.profiles WHERE id = NEW.user_id;

    IF v_hire_date IS NOT NULL AND NEW.start_date < (v_hire_date + INTERVAL '1 year')::date THEN
      v_is_sub_year := true;
    END IF;

    -- 반차는 반차로 유지 (잔여일 계산에서 월차 0.5일 차감)
    IF v_is_sub_year AND NEW.leave_type IN ('annual', 'sick') THEN
      NEW.leave_type := 'monthly';
    END IF;

    v_color := CASE NEW.leave_type
      WHEN 'annual' THEN 'blue'
      WHEN 'half_day' THEN 'cyan'
      WHEN 'monthly' THEN 'teal'
      WHEN 'summer' THEN 'orange'
      WHEN 'family_event' THEN 'gray'
      WHEN 'sick' THEN 'red'
      ELSE 'slate'
    END;

    v_label := CASE
      WHEN NEW.leave_type = 'half_day' AND NEW.half_day_period = 'am' THEN '오전반차'
      WHEN NEW.leave_type = 'half_day' AND NEW.half_day_period = 'pm' THEN '오후반차'
      ELSE public.leave_type_label(NEW.leave_type)
    END;

    INSERT INTO public.calendar_events (title, description, date, color, created_by)
    VALUES (
      '[' || v_label || '] ' || COALESCE(v_user_name, '직원'),
      COALESCE(NEW.reason, '') ||
        CASE WHEN NEW.start_date <> NEW.end_date
          THEN E'\n기간: ' || NEW.start_date || ' ~ ' || NEW.end_date
          ELSE ''
        END,
      NEW.start_date, v_color, NEW.user_id
    ) RETURNING id INTO v_event_id;

    NEW.calendar_event_id := v_event_id;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;

  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status = 'approved' THEN
    IF OLD.calendar_event_id IS NOT NULL THEN
      DELETE FROM public.calendar_events WHERE id = OLD.calendar_event_id;
      NEW.calendar_event_id := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_leave_insert_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
  v_user_name TEXT;
  v_color TEXT;
  v_hire_date DATE;
  v_is_sub_year BOOLEAN := false;
  v_label TEXT;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT name_kr, hire_date INTO v_user_name, v_hire_date
      FROM public.profiles WHERE id = NEW.user_id;

    IF v_hire_date IS NOT NULL AND NEW.start_date < (v_hire_date + INTERVAL '1 year')::date THEN
      v_is_sub_year := true;
    END IF;

    IF v_is_sub_year AND NEW.leave_type IN ('annual', 'sick') THEN
      NEW.leave_type := 'monthly';
    END IF;

    v_color := CASE NEW.leave_type
      WHEN 'annual' THEN 'blue'
      WHEN 'half_day' THEN 'cyan'
      WHEN 'monthly' THEN 'teal'
      WHEN 'summer' THEN 'orange'
      WHEN 'family_event' THEN 'gray'
      WHEN 'sick' THEN 'red'
      ELSE 'slate'
    END;

    v_label := CASE
      WHEN NEW.leave_type = 'half_day' AND NEW.half_day_period = 'am' THEN '오전반차'
      WHEN NEW.leave_type = 'half_day' AND NEW.half_day_period = 'pm' THEN '오후반차'
      ELSE public.leave_type_label(NEW.leave_type)
    END;

    INSERT INTO public.calendar_events (title, description, date, color, created_by)
    VALUES (
      '[' || v_label || '] ' || COALESCE(v_user_name, '직원'),
      COALESCE(NEW.reason, '') ||
        CASE WHEN NEW.start_date <> NEW.end_date
          THEN E'\n기간: ' || NEW.start_date || ' ~ ' || NEW.end_date
          ELSE ''
        END,
      NEW.start_date, v_color, NEW.user_id
    ) RETURNING id INTO v_event_id;

    NEW.calendar_event_id := v_event_id;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END;
$function$;

-- 이미 월차로 저장된 반차 기록 복구 (0.5일 + 사유에 반차 표기)
UPDATE public.leave_requests
   SET leave_type = 'half_day',
       half_day_period = CASE WHEN reason LIKE '%오전반차%' THEN 'am' ELSE 'pm' END
 WHERE leave_type = 'monthly'
   AND days = 0.5
   AND (reason LIKE '%오전반차%' OR reason LIKE '%오후반차%');

UPDATE public.calendar_events ce
   SET title = '[' || CASE WHEN lr.half_day_period = 'am' THEN '오전반차' ELSE '오후반차' END || '] ' || COALESCE(p.name_kr, '직원'),
       color = 'cyan'
  FROM public.leave_requests lr
  JOIN public.profiles p ON p.id = lr.user_id
 WHERE ce.id = lr.calendar_event_id
   AND lr.leave_type = 'half_day';