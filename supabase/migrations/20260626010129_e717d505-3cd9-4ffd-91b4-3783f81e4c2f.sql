
CREATE TABLE public.stock_alert_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.stock_urgent_alerts(id) ON DELETE CASCADE,
  ship_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alert_shipments TO authenticated;
GRANT ALL ON public.stock_alert_shipments TO service_role;

ALTER TABLE public.stock_alert_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipments_select_all" ON public.stock_alert_shipments
  FOR SELECT USING (true);

CREATE POLICY "shipments_insert_authorized" ON public.stock_alert_shipments
  FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      created_by = 'e9fe0398-346d-4930-831a-0ed5c1b9c539'::uuid
      OR has_role(auth.uid(), 'ceo'::app_role)
      OR has_role(auth.uid(), 'general_director'::app_role)
      OR has_role(auth.uid(), 'managing_director'::app_role)
    )
  );

CREATE POLICY "shipments_update_authorized" ON public.stock_alert_shipments
  FOR UPDATE USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
  );

CREATE POLICY "shipments_delete_authorized" ON public.stock_alert_shipments
  FOR DELETE USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
  );

CREATE INDEX idx_stock_alert_shipments_alert ON public.stock_alert_shipments(alert_id, ship_date DESC);

-- Trigger: 출고 기록 등록/수정/삭제 시 stock_urgent_alerts.stock_qty 자동 조정
CREATE OR REPLACE FUNCTION public.apply_shipment_to_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := -NEW.qty;
  ELSIF TG_OP = 'UPDATE' THEN
    delta := OLD.qty - NEW.qty;
  ELSIF TG_OP = 'DELETE' THEN
    delta := OLD.qty;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.stock_urgent_alerts
       SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) + delta)
     WHERE id = OLD.alert_id;
    RETURN OLD;
  ELSE
    UPDATE public.stock_urgent_alerts
       SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) + delta)
     WHERE id = NEW.alert_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_apply_shipment_to_alert
AFTER INSERT OR UPDATE OR DELETE ON public.stock_alert_shipments
FOR EACH ROW EXECUTE FUNCTION public.apply_shipment_to_alert();
