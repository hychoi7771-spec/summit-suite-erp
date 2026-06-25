
CREATE TABLE public.stock_urgent_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  stock_qty INTEGER,
  expiry_date DATE,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('high','medium','low')),
  sales_channel TEXT,
  incentive_note TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notice_id UUID REFERENCES public.notices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_urgent_alerts TO authenticated;
GRANT ALL ON public.stock_urgent_alerts TO service_role;

ALTER TABLE public.stock_urgent_alerts ENABLE ROW LEVEL SECURITY;

-- 인증된 모든 사용자 조회 가능
CREATE POLICY "stock_alerts_select_all"
ON public.stock_urgent_alerts FOR SELECT
TO authenticated
USING (true);

-- 작성자 본인 또는 화이트리스트(조정선 주임) 또는 CEO/총괄/실장 등록
CREATE POLICY "stock_alerts_insert_authorized"
ON public.stock_urgent_alerts FOR INSERT
TO authenticated
WITH CHECK (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    created_by = 'e9fe0398-346d-4930-831a-0ed5c1b9c539'::uuid
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'general_director'::app_role)
    OR public.has_role(auth.uid(), 'managing_director'::app_role)
  )
);

CREATE POLICY "stock_alerts_update_authorized"
ON public.stock_urgent_alerts FOR UPDATE
TO authenticated
USING (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
);

CREATE POLICY "stock_alerts_delete_authorized"
ON public.stock_urgent_alerts FOR DELETE
TO authenticated
USING (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'managing_director'::app_role)
);

CREATE TRIGGER trg_stock_alerts_updated_at
BEFORE UPDATE ON public.stock_urgent_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_urgent_alerts;
