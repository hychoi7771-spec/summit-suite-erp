
-- 1) 함수 수정: monthly 타입은 monthly_used_days로, annual/half_day/sick는 used_days로 집계
CREATE OR REPLACE FUNCTION public.calculate_leave_grant(_profile_id uuid, _today date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hire_date DATE;
  v_year INT := EXTRACT(YEAR FROM _today)::INT;
  v_months_worked INT;
  v_anniv_date DATE;
  v_monthly_grant INT := 0;
  v_annual_grant INT := 0;
  v_next_grant DATE;
  v_used NUMERIC := 0;
  v_monthly_used NUMERIC := 0;
BEGIN
  SELECT hire_date INTO v_hire_date FROM public.profiles WHERE id = _profile_id;
  IF v_hire_date IS NULL THEN RETURN; END IF;

  -- 연차/반차/병가 사용량 (해당 연도)
  SELECT COALESCE(SUM(days), 0) INTO v_used
    FROM public.leave_requests
   WHERE user_id = _profile_id
     AND status = 'approved'
     AND leave_type IN ('annual', 'half_day', 'sick')
     AND EXTRACT(YEAR FROM start_date) = v_year;

  -- 월차 사용량 (해당 연도)
  SELECT COALESCE(SUM(days), 0) INTO v_monthly_used
    FROM public.leave_requests
   WHERE user_id = _profile_id
     AND status = 'approved'
     AND leave_type = 'monthly'
     AND EXTRACT(YEAR FROM start_date) = v_year;

  v_anniv_date := v_hire_date + INTERVAL '1 year';

  IF _today < v_anniv_date THEN
    v_months_worked := EXTRACT(YEAR FROM age(_today, v_hire_date)) * 12
                     + EXTRACT(MONTH FROM age(_today, v_hire_date));
    IF EXTRACT(DAY FROM _today) >= EXTRACT(DAY FROM v_hire_date) THEN
      v_monthly_grant := LEAST(v_months_worked, 11);
    ELSE
      v_monthly_grant := LEAST(GREATEST(v_months_worked, 0), 11);
    END IF;
    v_annual_grant := 0;
    v_next_grant := (v_hire_date + ((v_monthly_grant + 1) || ' months')::INTERVAL)::DATE;
    IF v_next_grant > v_anniv_date THEN v_next_grant := v_anniv_date::DATE; END IF;
  ELSE
    v_annual_grant := 15;
    v_monthly_grant := 0;
    v_next_grant := (v_hire_date + ((EXTRACT(YEAR FROM age(_today, v_hire_date))::INT + 1) || ' years')::INTERVAL)::DATE;
  END IF;

  INSERT INTO public.leave_balances (user_id, year, total_days, used_days, monthly_total_days, monthly_used_days, next_grant_date)
  VALUES (_profile_id, v_year, v_annual_grant, v_used, v_monthly_grant, v_monthly_used, v_next_grant)
  ON CONFLICT (user_id, year) DO UPDATE
    SET total_days = EXCLUDED.total_days,
        monthly_total_days = EXCLUDED.monthly_total_days,
        next_grant_date = EXCLUDED.next_grant_date,
        used_days = EXCLUDED.used_days,
        monthly_used_days = EXCLUDED.monthly_used_days,
        updated_at = now();
END;
$function$;

-- 2) 오수경: 입사 1년 미만(2025-06-09)이므로 2026-06-08 이전 사용분은 월차여야 함
-- 현재 'annual'로 등록된 오수경의 모든 신청을 'monthly'로 변경 (이미지에 월차로 표시됨)
UPDATE public.leave_requests lr
SET leave_type = 'monthly'
FROM public.profiles p
WHERE lr.user_id = p.id
  AND p.name_kr = '오수경'
  AND lr.leave_type = 'annual';

-- 3) 최하용: 입사 1년 미만(2026-01-12), 사용분은 월차여야 함
UPDATE public.leave_requests lr
SET leave_type = 'monthly'
FROM public.profiles p
WHERE lr.user_id = p.id
  AND p.name_kr = '최하용'
  AND lr.leave_type = 'annual';

-- 4) 모든 직원 잔액 재계산 (현재 연도 기준)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE hire_date IS NOT NULL LOOP
    PERFORM public.calculate_leave_grant(rec.id, CURRENT_DATE);
  END LOOP;
END $$;

-- 5) 과거 연도(2025) 잔액도 재계산: 오수경 2025년 사용분 정정 반영
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE hire_date IS NOT NULL LOOP
    PERFORM public.calculate_leave_grant(rec.id, '2025-12-31'::date);
  END LOOP;
END $$;
