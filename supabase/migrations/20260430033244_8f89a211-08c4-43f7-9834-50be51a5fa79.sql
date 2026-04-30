-- 결제수단 enum 생성
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('personal', 'card', 'corporate', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- expenses 테이블에 payment_method 컬럼 추가
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'personal';