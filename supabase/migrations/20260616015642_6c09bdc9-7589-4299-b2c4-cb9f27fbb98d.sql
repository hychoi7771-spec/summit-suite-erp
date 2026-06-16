
-- 1) leave_type enum에 'monthly'가 있는지 확인 (이미 있음, 오수경 데이터에서 사용 중)

-- 2) handle_leave_insert_approved 트리거 수정: <1년 직원의 annual/half_day/sick → monthly 자동 변환
CREATE OR REPLACE FUNCTION public.handle_leave_insert_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
  v_user_name TEXT;
  v_year INTEGER;
  v_color TEXT;
  v_hire_date DATE;
  v_is_sub_year BOOLEAN := false;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT name_kr, hire_date INTO v_user_name, v_hire_date
      FROM public.profiles WHERE id = NEW.user_id;

    -- 입사 1년 미만 판단 (휴가 시작일 기준)
    IF v_hire_date IS NOT NULL AND NEW.start_date < (v_hire_date + INTERVAL '1 year')::date THEN
      v_is_sub_year := true;
    END IF;

    -- <1년 직원이 연차/반차/병가 신청 시 자동으로 월차로 변환
    IF v_is_sub_year AND NEW.leave_type IN ('annual', 'half_day', 'sick') THEN
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
    INSERT INTO public.calendar_events (title, description, date, color, created_by)
    VALUES (
      '[' || public.leave_type_label(NEW.leave_type) || '] ' || COALESCE(v_user_name, '직원'),
      COALESCE(NEW.reason, '') ||
        CASE WHEN NEW.start_date <> NEW.end_date
          THEN E'\n기간: ' || NEW.start_date || ' ~ ' || NEW.end_date
          ELSE ''
        END,
      NEW.start_date, v_color, NEW.user_id
    ) RETURNING id INTO v_event_id;
    NEW.calendar_event_id := v_event_id;
    NEW.approved_at := COALESCE(NEW.approved_at, now());

    v_year := EXTRACT(YEAR FROM NEW.start_date);
    IF NEW.leave_type IN ('annual', 'half_day', 'sick') THEN
      INSERT INTO public.leave_balances (user_id, year, total_days, used_days)
      VALUES (NEW.user_id, v_year, 15, NEW.days)
      ON CONFLICT (user_id, year)
      DO UPDATE SET used_days = public.leave_balances.used_days + NEW.days;
    ELSIF NEW.leave_type = 'monthly' THEN
      INSERT INTO public.leave_balances (user_id, year, monthly_total_days, monthly_used_days)
      VALUES (NEW.user_id, v_year, 0, NEW.days)
      ON CONFLICT (user_id, year)
      DO UPDATE SET monthly_used_days = COALESCE(public.leave_balances.monthly_used_days,0) + NEW.days;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) handle_leave_approval 트리거도 동일 로직
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
  v_user_name TEXT;
  v_year INTEGER;
  v_color TEXT;
  v_hire_date DATE;
  v_is_sub_year BOOLEAN := false;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT name_kr, hire_date INTO v_user_name, v_hire_date
      FROM public.profiles WHERE id = NEW.user_id;

    IF v_hire_date IS NOT NULL AND NEW.start_date < (v_hire_date + INTERVAL '1 year')::date THEN
      v_is_sub_year := true;
    END IF;

    IF v_is_sub_year AND NEW.leave_type IN ('annual', 'half_day', 'sick') THEN
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

    INSERT INTO public.calendar_events (title, description, date, color, created_by)
    VALUES (
      '[' || public.leave_type_label(NEW.leave_type) || '] ' || COALESCE(v_user_name, '직원'),
      COALESCE(NEW.reason, '') ||
        CASE WHEN NEW.start_date <> NEW.end_date
          THEN E'\n기간: ' || NEW.start_date || ' ~ ' || NEW.end_date
          ELSE ''
        END,
      NEW.start_date, v_color, NEW.user_id
    ) RETURNING id INTO v_event_id;

    NEW.calendar_event_id := v_event_id;
    NEW.approved_at := COALESCE(NEW.approved_at, now());

    v_year := EXTRACT(YEAR FROM NEW.start_date);
    IF NEW.leave_type IN ('annual', 'half_day', 'sick') THEN
      INSERT INTO public.leave_balances (user_id, year, total_days, used_days)
      VALUES (NEW.user_id, v_year, 15, NEW.days)
      ON CONFLICT (user_id, year)
      DO UPDATE SET used_days = public.leave_balances.used_days + NEW.days;
    ELSIF NEW.leave_type = 'monthly' THEN
      INSERT INTO public.leave_balances (user_id, year, monthly_total_days, monthly_used_days)
      VALUES (NEW.user_id, v_year, 0, NEW.days)
      ON CONFLICT (user_id, year)
      DO UPDATE SET monthly_used_days = COALESCE(public.leave_balances.monthly_used_days,0) + NEW.days;
    END IF;
  END IF;

  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status = 'approved' THEN
    IF OLD.calendar_event_id IS NOT NULL THEN
      DELETE FROM public.calendar_events WHERE id = OLD.calendar_event_id;
      NEW.calendar_event_id := NULL;
    END IF;
    v_year := EXTRACT(YEAR FROM OLD.start_date);
    IF OLD.leave_type IN ('annual', 'half_day', 'sick') THEN
      UPDATE public.leave_balances
        SET used_days = GREATEST(0, used_days - OLD.days)
        WHERE user_id = OLD.user_id AND year = v_year;
    ELSIF OLD.leave_type = 'monthly' THEN
      UPDATE public.leave_balances
        SET monthly_used_days = GREATEST(0, COALESCE(monthly_used_days,0) - OLD.days)
        WHERE user_id = OLD.user_id AND year = v_year;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) leave_type_label에 monthly 추가
CREATE OR REPLACE FUNCTION public.leave_type_label(t leave_type)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE t
    WHEN 'annual' THEN '연차'
    WHEN 'half_day' THEN '반차'
    WHEN 'monthly' THEN '월차'
    WHEN 'summer' THEN '여름휴가'
    WHEN 'family_event' THEN '경조사'
    WHEN 'sick' THEN '병가'
    WHEN 'other' THEN '기타'
  END;
$function$;
