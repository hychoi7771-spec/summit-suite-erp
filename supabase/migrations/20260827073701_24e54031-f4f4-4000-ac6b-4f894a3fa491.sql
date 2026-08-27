ALTER TABLE public.leave_balances
  ADD COLUMN IF NOT EXISTS fiscal_start date,
  ADD COLUMN IF NOT EXISTS fiscal_end date;

-- 내부 재계산 함수 (권한 검사 없음, 트리거/관리 함수 전용)
CREATE OR REPLACE FUNCTION public.recalc_leave_grant(_profile_id uuid, _today date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hire DATE;
  v_years INT;
  v_months INT;
  v_fs DATE;
  v_fe DATE;
  v_annual NUMERIC := 0;
  v_used NUMERIC := 0;
  v_m_total NUMERIC := 0;
  v_m_used NUMERIC := 0;
  v_next DATE;
  v_year INT;
  v_consumed NUMERIC := 0;
BEGIN
  IF _today IS NULL OR _today > CURRENT_DATE THEN
    _today := CURRENT_DATE;
  END IF;

  SELECT hire_date INTO v_hire FROM public.profiles WHERE id = _profile_id;
  IF v_hire IS NULL THEN RETURN; END IF;

  v_year := EXTRACT(YEAR FROM _today)::INT;
  v_years := EXTRACT(YEAR FROM age(_today, v_hire))::INT;

  IF v_years < 1 THEN
    -- 입사 1년 미만: 월차 개념 (근무 개월 수, 최대 11)
    v_fs := v_hire;
    v_fe := (v_hire + INTERVAL '1 year')::DATE;
    v_months := EXTRACT(YEAR FROM age(_today, v_hire))::INT * 12
              + EXTRACT(MONTH FROM age(_today, v_hire))::INT;
    v_months := LEAST(GREATEST(v_months, 0), 11);

    SELECT COALESCE(SUM(days), 0) INTO v_consumed
      FROM public.leave_requests
     WHERE user_id = _profile_id
       AND status = 'approved'
       AND leave_type IN ('annual', 'half_day', 'sick', 'monthly')
       AND start_date >= v_fs AND start_date < v_fe;

    v_m_used := v_consumed;
    v_m_total := GREATEST(v_months, v_m_used);
    v_annual := 0;
    v_used := 0;
    v_next := LEAST((v_hire + ((v_months + 1) || ' months')::INTERVAL)::DATE, v_fe);
  ELSE
    -- 입사 1년 경과: 입사기념일 기준 회계연도, 연차 15일
    v_fs := (v_hire + (v_years || ' years')::INTERVAL)::DATE;
    v_fe := (v_fs + INTERVAL '1 year')::DATE;
    v_annual := 15;

    SELECT COALESCE(SUM(days), 0) INTO v_used
      FROM public.leave_requests
     WHERE user_id = _profile_id
       AND status = 'approved'
       AND leave_type IN ('annual', 'half_day', 'sick', 'monthly')
       AND start_date >= v_fs AND start_date < v_fe;

    v_m_total := 0;
    v_m_used := 0;
    v_next := v_fe;
  END IF;

  INSERT INTO public.leave_balances (
    user_id, year, total_days, used_days,
    monthly_total_days, monthly_used_days,
    next_grant_date, fiscal_start, fiscal_end
  )
  VALUES (
    _profile_id, v_year, v_annual, v_used,
    v_m_total, v_m_used, v_next, v_fs, v_fe
  )
  ON CONFLICT (user_id, year) DO UPDATE
    SET total_days = EXCLUDED.total_days,
        used_days = EXCLUDED.used_days,
        monthly_total_days = EXCLUDED.monthly_total_days,
        monthly_used_days = EXCLUDED.monthly_used_days,
        next_grant_date = EXCLUDED.next_grant_date,
        fiscal_start = EXCLUDED.fiscal_start,
        fiscal_end = EXCLUDED.fiscal_end,
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.recalc_leave_grant(uuid, date) FROM PUBLIC, anon, authenticated;

-- 공개 RPC: 권한 검사 후 재계산 위임
CREATE OR REPLACE FUNCTION public.calculate_leave_grant(_profile_id uuid, _today date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
       has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permission denied: HR admin role required'
      USING ERRCODE = '42501';
  END IF;

  PERFORM public.recalc_leave_grant(_profile_id, _today);
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_monthly_leave_grant()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  cnt INT := 0;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE hire_date IS NOT NULL LOOP
    PERFORM public.recalc_leave_grant(r.id, CURRENT_DATE);
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$function$;

-- 승인 트리거: 잔액 증감 로직 제거 (재계산 트리거가 담당)
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
BEGIN
  IF NEW.status = 'approved' THEN
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
  END IF;
  RETURN NEW;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.leave_request_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_leave_grant(OLD.user_id, CURRENT_DATE);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_leave_grant(NEW.user_id, CURRENT_DATE);
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.recalc_leave_grant(OLD.user_id, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_leave_request_recalc ON public.leave_requests;
CREATE TRIGGER trg_leave_request_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.leave_request_recalc();

SELECT public.run_monthly_leave_grant();