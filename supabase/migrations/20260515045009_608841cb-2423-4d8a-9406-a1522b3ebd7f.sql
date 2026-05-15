
-- 매월 자동 연차 적립 스케줄 + 즉시 1회 실행
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 동일 작업 제거 (있으면)
DO $$
BEGIN
  PERFORM cron.unschedule('daily-leave-grant');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 매일 00:10 KST (= 15:10 UTC)에 전직원 연차/월차 자동 재계산
SELECT cron.schedule(
  'daily-leave-grant',
  '10 15 * * *',
  $$ SELECT public.run_monthly_leave_grant(); $$
);

-- 지금 즉시 1회 실행하여 이달치 누락분 반영
SELECT public.run_monthly_leave_grant();
