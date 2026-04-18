-- 휴가 유형 enum
CREATE TYPE public.leave_type AS ENUM ('annual', 'half_day', 'summer', 'family_event', 'sick', 'other');

-- 휴가 신청 상태 enum
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- 휴가 신청 테이블
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(4,1) NOT NULL DEFAULT 1,
  reason TEXT,
  status public.leave_status NOT NULL DEFAULT 'pending',
  approval_id UUID REFERENCES public.approvals(id) ON DELETE SET NULL,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 연차 잔여일수 테이블
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days NUMERIC(4,1) NOT NULL DEFAULT 15,
  used_days NUMERIC(4,1) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);

-- 인덱스
CREATE INDEX idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_balances_user_year ON public.leave_balances(user_id, year);

-- RLS 활성화
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- leave_requests 정책
CREATE POLICY "Leave requests viewable by authenticated"
  ON public.leave_requests FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Leave requests insertable by self"
  ON public.leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Leave requests updatable by self or admin"
  ON public.leave_requests FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
  );

CREATE POLICY "Leave requests deletable by self or admin"
  ON public.leave_requests FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
  );

-- leave_balances 정책
CREATE POLICY "Leave balances viewable by authenticated"
  ON public.leave_balances FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Leave balances insertable by admin"
  ON public.leave_balances FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
  );

CREATE POLICY "Leave balances updatable by admin or system"
  ON public.leave_balances FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
    OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Leave balances deletable by admin"
  ON public.leave_balances FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
  );

-- updated_at 트리거
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 휴가 유형 한글 라벨 함수
CREATE OR REPLACE FUNCTION public.leave_type_label(t public.leave_type)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE t
    WHEN 'annual' THEN '연차'
    WHEN 'half_day' THEN '반차'
    WHEN 'summer' THEN '여름휴가'
    WHEN 'family_event' THEN '경조사'
    WHEN 'sick' THEN '병가'
    WHEN 'other' THEN '기타'
  END;
$$;

-- 휴가 승인 시: 캘린더 자동 등록 + 연차 잔여일수 차감
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_user_name TEXT;
  v_year INTEGER;
  v_color TEXT;
BEGIN
  -- 'pending' → 'approved' 전환 시에만 동작
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- 사용자 이름 가져오기
    SELECT name_kr INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

    -- 휴가 유형별 색상
    v_color := CASE NEW.leave_type
      WHEN 'annual' THEN 'blue'
      WHEN 'half_day' THEN 'cyan'
      WHEN 'summer' THEN 'orange'
      WHEN 'family_event' THEN 'gray'
      WHEN 'sick' THEN 'red'
      ELSE 'slate'
    END;

    -- 캘린더 이벤트 자동 생성 (시작일 기준, 여러 날이면 시작일에만 표시)
    INSERT INTO public.calendar_events (title, description, date, color, created_by)
    VALUES (
      '[' || public.leave_type_label(NEW.leave_type) || '] ' || COALESCE(v_user_name, '직원'),
      COALESCE(NEW.reason, '') ||
        CASE WHEN NEW.start_date <> NEW.end_date
          THEN E'\n기간: ' || NEW.start_date || ' ~ ' || NEW.end_date
          ELSE ''
        END,
      NEW.start_date,
      v_color,
      NEW.user_id
    )
    RETURNING id INTO v_event_id;

    NEW.calendar_event_id := v_event_id;
    NEW.approved_at := COALESCE(NEW.approved_at, now());

    -- 연차/반차인 경우 잔여일수 차감 (해당 연도 잔액 없으면 자동 생성)
    IF NEW.leave_type IN ('annual', 'half_day', 'sick') THEN
      v_year := EXTRACT(YEAR FROM NEW.start_date);
      INSERT INTO public.leave_balances (user_id, year, total_days, used_days)
      VALUES (NEW.user_id, v_year, 15, NEW.days)
      ON CONFLICT (user_id, year)
      DO UPDATE SET used_days = public.leave_balances.used_days + NEW.days;
    END IF;
  END IF;

  -- 승인 취소/반려 시 캘린더 이벤트 제거 + 잔액 복구
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status = 'approved' THEN
    IF OLD.calendar_event_id IS NOT NULL THEN
      DELETE FROM public.calendar_events WHERE id = OLD.calendar_event_id;
      NEW.calendar_event_id := NULL;
    END IF;
    IF OLD.leave_type IN ('annual', 'half_day', 'sick') THEN
      v_year := EXTRACT(YEAR FROM OLD.start_date);
      UPDATE public.leave_balances
        SET used_days = GREATEST(0, used_days - OLD.days)
        WHERE user_id = OLD.user_id AND year = v_year;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leave_approval
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_leave_approval();

-- 휴가 신청 즉시 승인된 경우(관리자 직접 등록)도 처리하는 INSERT 트리거
CREATE OR REPLACE FUNCTION public.handle_leave_insert_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_user_name TEXT;
  v_year INTEGER;
  v_color TEXT;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT name_kr INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
    v_color := CASE NEW.leave_type
      WHEN 'annual' THEN 'blue'
      WHEN 'half_day' THEN 'cyan'
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
    IF NEW.leave_type IN ('annual', 'half_day', 'sick') THEN
      v_year := EXTRACT(YEAR FROM NEW.start_date);
      INSERT INTO public.leave_balances (user_id, year, total_days, used_days)
      VALUES (NEW.user_id, v_year, 15, NEW.days)
      ON CONFLICT (user_id, year)
      DO UPDATE SET used_days = public.leave_balances.used_days + NEW.days;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leave_insert_approved
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_leave_insert_approved();
