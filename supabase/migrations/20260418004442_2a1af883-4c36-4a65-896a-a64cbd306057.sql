-- 1) profiles에 hire_date 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 2) leave_balances에 월차 관련 컬럼 추가
ALTER TABLE public.leave_balances
  ADD COLUMN IF NOT EXISTS monthly_total_days NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_used_days NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_grant_date DATE;

-- 3) 한 명의 (user_id, year) 잔액을 입사일·현재일 기준으로 재계산하는 함수
CREATE OR REPLACE FUNCTION public.calculate_leave_grant(_profile_id UUID, _today DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 올해 사용량(승인된 휴가 합계) 계산
  SELECT COALESCE(SUM(days), 0) INTO v_used
    FROM public.leave_requests
   WHERE user_id = _profile_id
     AND status = 'approved'
     AND leave_type IN ('annual', 'half_day', 'sick')
     AND EXTRACT(YEAR FROM start_date) = v_year;

  -- 입사 기준 만 1년이 되는 날
  v_anniv_date := v_hire_date + INTERVAL '1 year';

  IF _today < v_anniv_date THEN
    -- 1년 미만: 매월 입사일에 1일씩 발생 (최대 11개)
    v_months_worked := EXTRACT(YEAR FROM age(_today, v_hire_date)) * 12
                     + EXTRACT(MONTH FROM age(_today, v_hire_date));
    IF EXTRACT(DAY FROM _today) >= EXTRACT(DAY FROM v_hire_date) THEN
      v_monthly_grant := LEAST(v_months_worked, 11);
    ELSE
      v_monthly_grant := LEAST(GREATEST(v_months_worked, 0), 11);
    END IF;
    v_annual_grant := 0;
    -- 다음 발생일 = 다음 달 입사일(또는 1주년)
    v_next_grant := (v_hire_date + ((v_monthly_grant + 1) || ' months')::INTERVAL)::DATE;
    IF v_next_grant > v_anniv_date THEN v_next_grant := v_anniv_date::DATE; END IF;
  ELSE
    -- 1년 이상: 연차 15일 (단순화: 연도별 15일)
    v_annual_grant := 15;
    v_monthly_grant := 0;
    -- 다음 발생일 = 내년 입사 기념일
    v_next_grant := (v_hire_date + ((EXTRACT(YEAR FROM age(_today, v_hire_date))::INT + 1) || ' years')::INTERVAL)::DATE;
  END IF;

  INSERT INTO public.leave_balances (user_id, year, total_days, used_days, monthly_total_days, monthly_used_days, next_grant_date)
  VALUES (_profile_id, v_year, v_annual_grant, v_used, v_monthly_grant, 0, v_next_grant)
  ON CONFLICT (user_id, year) DO UPDATE
    SET total_days = EXCLUDED.total_days,
        monthly_total_days = EXCLUDED.monthly_total_days,
        next_grant_date = EXCLUDED.next_grant_date,
        used_days = EXCLUDED.used_days,
        updated_at = now();
END;
$$;

-- 4) 모든 직원 일괄 재계산
CREATE OR REPLACE FUNCTION public.run_monthly_leave_grant()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  cnt INT := 0;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE hire_date IS NOT NULL LOOP
    PERFORM public.calculate_leave_grant(r.id, CURRENT_DATE);
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- 5) 기존 8명 직원 입사일 시드 (이미지 데이터 기반)
UPDATE public.profiles SET hire_date = '2024-11-30' WHERE name_kr = '이난영';
UPDATE public.profiles SET hire_date = '2024-11-30' WHERE name_kr = '공경미';
UPDATE public.profiles SET hire_date = '2024-11-30' WHERE name_kr = '조정선';
UPDATE public.profiles SET hire_date = '2024-11-30' WHERE name_kr = '이진숙';
UPDATE public.profiles SET hire_date = '2024-11-30' WHERE name_kr = '신혜교';
UPDATE public.profiles SET hire_date = '2025-03-04' WHERE name_kr = '박주원';
UPDATE public.profiles SET hire_date = '2025-06-09' WHERE name_kr = '오수경';
UPDATE public.profiles SET hire_date = '2026-01-12' WHERE name_kr = '최하용';

-- 6) 잔액 1회 자동 계산 실행 (이미지 사용량은 신청 누적으로 자연스럽게 반영됨)
SELECT public.run_monthly_leave_grant();

-- 7) (user_id, year) UNIQUE 제약이 없으면 추가 (ON CONFLICT 동작 보장)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_user_year_unique'
  ) THEN
    ALTER TABLE public.leave_balances
      ADD CONSTRAINT leave_balances_user_year_unique UNIQUE (user_id, year);
  END IF;
END $$;