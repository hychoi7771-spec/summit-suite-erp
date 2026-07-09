
CREATE OR REPLACE FUNCTION public.calculate_leave_grant(_profile_id uuid, _today date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hire_date DATE;
  v_year INT;
  v_months_worked INT;
  v_anniv_date DATE;
  v_monthly_grant INT := 0;
  v_annual_grant NUMERIC := 0;
  v_next_grant DATE;
  v_used NUMERIC := 0;
  v_monthly_used NUMERIC := 0;
  v_existing_monthly_total NUMERIC := 0;
  v_carryover NUMERIC := 0;
  v_final_monthly_total NUMERIC := 0;
  v_potential_monthly NUMERIC := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
       has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permission denied: manager role required'
      USING ERRCODE = '42501';
  END IF;

  IF _today IS NULL OR _today > CURRENT_DATE THEN
    _today := CURRENT_DATE;
  END IF;
  v_year := EXTRACT(YEAR FROM _today)::INT;

  SELECT hire_date INTO v_hire_date FROM public.profiles WHERE id = _profile_id;
  IF v_hire_date IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(days), 0) INTO v_used
    FROM public.leave_requests
   WHERE user_id = _profile_id AND status = 'approved'
     AND leave_type IN ('annual', 'half_day', 'sick')
     AND EXTRACT(YEAR FROM start_date) = v_year;

  SELECT COALESCE(SUM(days), 0) INTO v_monthly_used
    FROM public.leave_requests
   WHERE user_id = _profile_id AND status = 'approved'
     AND leave_type = 'monthly'
     AND EXTRACT(YEAR FROM start_date) = v_year;

  SELECT COALESCE(monthly_total_days, 0) INTO v_existing_monthly_total
    FROM public.leave_balances WHERE user_id = _profile_id AND year = v_year;

  v_anniv_date := (v_hire_date + INTERVAL '1 year')::DATE;

  IF _today < v_anniv_date THEN
    v_months_worked := EXTRACT(YEAR FROM age(_today, v_hire_date)) * 12
                     + EXTRACT(MONTH FROM age(_today, v_hire_date));
    v_monthly_grant := LEAST(GREATEST(v_months_worked, 0), 11);
    v_annual_grant := 0;
    v_final_monthly_total := GREATEST(v_monthly_grant, v_existing_monthly_total, v_monthly_used);
    v_next_grant := (v_hire_date + ((v_monthly_grant + 1) || ' months')::INTERVAL)::DATE;
    IF v_next_grant > v_anniv_date THEN v_next_grant := v_anniv_date; END IF;
  ELSE
    -- Anniversary 이후: 월차 이력이 실제로 존재하는 경우에만 이월 계산 적용
    -- (시스템 도입 전 입사자는 monthly_total_days/monthly_used_days = 0 → 이월 없음)
    IF v_existing_monthly_total > 0 OR v_monthly_used > 0 THEN
      v_potential_monthly := 11;
      v_carryover := GREATEST(0, v_potential_monthly - v_monthly_used);
      v_final_monthly_total := GREATEST(v_potential_monthly, v_existing_monthly_total, v_monthly_used);
    ELSE
      v_carryover := 0;
      v_final_monthly_total := 0;
    END IF;
    v_annual_grant := 15 + v_carryover;
    v_next_grant := (v_hire_date + ((EXTRACT(YEAR FROM age(_today, v_hire_date))::INT + 1) || ' years')::INTERVAL)::DATE;
  END IF;

  INSERT INTO public.leave_balances (user_id, year, total_days, used_days, monthly_total_days, monthly_used_days, next_grant_date)
  VALUES (_profile_id, v_year, v_annual_grant, v_used, v_final_monthly_total, v_monthly_used, v_next_grant)
  ON CONFLICT (user_id, year) DO UPDATE
    SET total_days = EXCLUDED.total_days,
        monthly_total_days = EXCLUDED.monthly_total_days,
        next_grant_date = EXCLUDED.next_grant_date,
        used_days = EXCLUDED.used_days,
        monthly_used_days = EXCLUDED.monthly_used_days,
        updated_at = now();
END;
$function$;

SELECT public.run_monthly_leave_grant();
