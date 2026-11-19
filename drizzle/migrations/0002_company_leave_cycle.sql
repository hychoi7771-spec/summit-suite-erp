ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leave_cycle text NOT NULL DEFAULT 'hire_anniversary';
UPDATE public.profiles SET leave_cycle = 'company' WHERE hire_date = DATE '2024-11-30';

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'profiles.user_id는 변경할 수 없습니다.' USING ERRCODE = '42501';
  END IF;
  IF NEW.leave_cycle IS DISTINCT FROM OLD.leave_cycle AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(),'ceo') OR public.has_role(auth.uid(),'general_director')) THEN
    RAISE EXCEPTION '연차 기준은 관리자만 변경할 수 있습니다.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_leave_grant(_profile_id uuid, _today date DEFAULT CURRENT_DATE)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_hire DATE; v_cycle TEXT; v_years INT; v_months INT; v_fs DATE; v_fe DATE;
  v_annual NUMERIC := 0; v_used NUMERIC := 0; v_m_total NUMERIC := 0; v_m_used NUMERIC := 0;
  v_next DATE; v_year INT; v_consumed NUMERIC := 0;
  c_switch CONSTANT DATE := DATE '2026-12-01';
BEGIN
  IF _today IS NULL OR _today > CURRENT_DATE THEN _today := CURRENT_DATE; END IF;
  SELECT hire_date, leave_cycle INTO v_hire, v_cycle FROM public.profiles WHERE id = _profile_id;
  IF v_hire IS NULL THEN RETURN; END IF;

  v_year := EXTRACT(YEAR FROM _today)::INT;
  v_years := EXTRACT(YEAR FROM age(_today, v_hire))::INT;

  IF v_cycle = 'company' AND v_years >= 1 THEN
    -- 회사 회기: 12/1 ~ 11/30, 연 16일, 잔여 소멸 (2026-12-01 시행, 그 전은 전환 회기 15일)
    IF _today < c_switch THEN
      v_fs := DATE '2025-11-30'; v_fe := c_switch; v_annual := 15;
    ELSE
      v_fs := make_date(CASE WHEN EXTRACT(MONTH FROM _today) = 12 THEN v_year ELSE v_year - 1 END, 12, 1);
      v_fe := (v_fs + INTERVAL '1 year')::DATE; v_annual := 16;
    END IF;
    SELECT COALESCE(SUM(days), 0) INTO v_used FROM public.leave_requests
     WHERE user_id = _profile_id AND status = 'approved'
       AND leave_type IN ('annual','half_day','sick','monthly')
       AND start_date >= v_fs AND start_date < v_fe;
    v_next := v_fe;
    v_year := EXTRACT(YEAR FROM v_fe)::INT;
  ELSIF v_years < 1 THEN
    v_fs := v_hire; v_fe := (v_hire + INTERVAL '1 year')::DATE;
    v_months := EXTRACT(YEAR FROM age(_today, v_hire))::INT * 12 + EXTRACT(MONTH FROM age(_today, v_hire))::INT;
    v_months := LEAST(GREATEST(v_months, 0), 11);
    SELECT COALESCE(SUM(days), 0) INTO v_consumed FROM public.leave_requests
     WHERE user_id = _profile_id AND status = 'approved'
       AND leave_type IN ('annual','half_day','sick','monthly')
       AND start_date >= v_fs AND start_date < v_fe;
    v_m_used := v_consumed; v_m_total := GREATEST(v_months, v_m_used);
    v_next := LEAST((v_hire + ((v_months + 1) || ' months')::INTERVAL)::DATE, v_fe);
  ELSE
    v_fs := (v_hire + (v_years || ' years')::INTERVAL)::DATE;
    v_fe := (v_fs + INTERVAL '1 year')::DATE; v_annual := 15;
    SELECT COALESCE(SUM(days), 0) INTO v_used FROM public.leave_requests
     WHERE user_id = _profile_id AND status = 'approved'
       AND leave_type IN ('annual','half_day','sick','monthly')
       AND start_date >= v_fs AND start_date < v_fe;
    v_next := v_fe;
  END IF;

  INSERT INTO public.leave_balances (user_id, year, total_days, used_days, monthly_total_days, monthly_used_days, next_grant_date, fiscal_start, fiscal_end)
  VALUES (_profile_id, v_year, v_annual, v_used, v_m_total, v_m_used, v_next, v_fs, v_fe)
  ON CONFLICT (user_id, year) DO UPDATE SET total_days = EXCLUDED.total_days, used_days = EXCLUDED.used_days,
    monthly_total_days = EXCLUDED.monthly_total_days, monthly_used_days = EXCLUDED.monthly_used_days,
    next_grant_date = EXCLUDED.next_grant_date, fiscal_start = EXCLUDED.fiscal_start, fiscal_end = EXCLUDED.fiscal_end, updated_at = now();
END;
$function$;

SELECT public.recalc_leave_grant(id, CURRENT_DATE) FROM public.profiles WHERE leave_cycle = 'company';