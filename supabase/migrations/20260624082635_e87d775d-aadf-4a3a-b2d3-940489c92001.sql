-- 반차 시간대 강제 검증을 위한 컬럼 + 트리거 추가
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS half_day_period TEXT;

-- 기존 half_day 데이터 기본값 보정: reason 에 '오후반차' 포함이면 pm, 그 외는 am
UPDATE public.leave_requests
   SET half_day_period = CASE
     WHEN reason ILIKE '%오후반차%' THEN 'pm'
     ELSE 'am'
   END
 WHERE leave_type = 'half_day' AND half_day_period IS NULL;

-- 값 도메인 제약
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_half_day_period_check;
ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_half_day_period_check
  CHECK (half_day_period IS NULL OR half_day_period IN ('am','pm'));

-- 검증 트리거: 반차일 때는 period 필수 + 하루 + 0.5일,
-- 반차가 아닐 때는 period NULL 강제
CREATE OR REPLACE FUNCTION public.validate_half_day_leave()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.leave_type = 'half_day' THEN
    IF NEW.half_day_period IS NULL OR NEW.half_day_period NOT IN ('am','pm') THEN
      RAISE EXCEPTION '반차 신청 시 시간대는 오전(am, 9:00~14:00) 또는 오후(pm, 14:00~18:00) 중 하나여야 합니다.'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.start_date <> NEW.end_date THEN
      RAISE EXCEPTION '반차는 하루(시작일=종료일)만 신청할 수 있습니다.'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.days <> 0.5 THEN
      NEW.days := 0.5; -- 회사 규정상 4시간 = 0.5일 고정
    END IF;
  ELSE
    -- 반차가 아닌 유형은 시간대 값을 가질 수 없음
    IF NEW.half_day_period IS NOT NULL THEN
      NEW.half_day_period := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_half_day_leave ON public.leave_requests;
CREATE TRIGGER trg_validate_half_day_leave
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_half_day_leave();