
-- =========== helper: sales admin check ============
CREATE OR REPLACE FUNCTION public.is_sales_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'ceo'::app_role)
      OR public.has_role(_uid, 'general_director'::app_role)
      OR public.has_role(_uid, 'managing_director'::app_role);
$$;

-- =========== 1. MD 월간 목표 ============
CREATE TABLE public.sales_md_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  md_name text NOT NULL,
  year_month text NOT NULL,             -- 'YYYY-MM'
  target_revenue numeric NOT NULL DEFAULT 0,
  target_profit numeric NOT NULL DEFAULT 0,
  channel_count int DEFAULT 0,
  growth_rate numeric,
  note text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (md_name, year_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_md_targets TO authenticated;
GRANT ALL ON public.sales_md_targets TO service_role;
ALTER TABLE public.sales_md_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_admin_all_md_targets" ON public.sales_md_targets
  FOR ALL TO authenticated
  USING (public.is_sales_admin(auth.uid()))
  WITH CHECK (public.is_sales_admin(auth.uid()));
CREATE TRIGGER trg_sales_md_targets_updated
  BEFORE UPDATE ON public.sales_md_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== 2. 채널별 목표/실적 ============
CREATE TABLE public.sales_channel_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  md_name text NOT NULL,
  channel_name text NOT NULL,
  year_month text NOT NULL,
  target_revenue numeric DEFAULT 0,
  target_profit numeric DEFAULT 0,
  actual_revenue numeric DEFAULT 0,
  actual_profit numeric DEFAULT 0,
  note text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (md_name, channel_name, year_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channel_actuals TO authenticated;
GRANT ALL ON public.sales_channel_actuals TO service_role;
ALTER TABLE public.sales_channel_actuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_admin_all_channel_actuals" ON public.sales_channel_actuals
  FOR ALL TO authenticated
  USING (public.is_sales_admin(auth.uid()))
  WITH CHECK (public.is_sales_admin(auth.uid()));
CREATE TRIGGER trg_sales_channel_actuals_updated
  BEFORE UPDATE ON public.sales_channel_actuals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_sca_md_ym ON public.sales_channel_actuals (md_name, year_month);
CREATE INDEX idx_sca_ym ON public.sales_channel_actuals (year_month);

-- =========== 3. 주간 영업회의 ============
CREATE TABLE public.weekly_sales_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  title text,
  attendees text,
  highlights jsonb DEFAULT '[]'::jsonb,           -- 이번 주 핵심 3가지 (배열)
  season_calendar jsonb DEFAULT '[]'::jsonb,       -- [{label,date,dday_note}]
  weather_note text,
  channel_review text,
  inventory_review text,
  event_review text,
  marketing_review text,
  md_review text,
  checklist jsonb DEFAULT '[]'::jsonb,             -- [{owner,action,due}]
  source_file_id uuid REFERENCES public.asset_files ON DELETE SET NULL,
  ai_summary text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_sales_meetings TO authenticated;
GRANT ALL ON public.weekly_sales_meetings TO service_role;
ALTER TABLE public.weekly_sales_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_admin_all_weekly_meetings" ON public.weekly_sales_meetings
  FOR ALL TO authenticated
  USING (public.is_sales_admin(auth.uid()))
  WITH CHECK (public.is_sales_admin(auth.uid()));
CREATE TRIGGER trg_wsm_updated
  BEFORE UPDATE ON public.weekly_sales_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== 4. MD 요약 뷰 ============
CREATE OR REPLACE VIEW public.v_sales_md_summary AS
SELECT
  t.md_name,
  t.year_month,
  t.target_revenue,
  t.target_profit,
  t.channel_count,
  t.growth_rate,
  COALESCE(SUM(c.actual_revenue), 0) AS actual_revenue,
  COALESCE(SUM(c.actual_profit), 0)  AS actual_profit,
  CASE WHEN t.target_revenue > 0
       THEN ROUND(COALESCE(SUM(c.actual_revenue),0) / t.target_revenue * 100, 1)
       ELSE NULL END AS revenue_achievement_pct,
  CASE WHEN t.target_profit > 0
       THEN ROUND(COALESCE(SUM(c.actual_profit),0) / t.target_profit * 100, 1)
       ELSE NULL END AS profit_achievement_pct,
  CASE WHEN COALESCE(SUM(c.actual_revenue),0) > 0
       THEN ROUND(COALESCE(SUM(c.actual_profit),0) / SUM(c.actual_revenue) * 100, 1)
       ELSE NULL END AS profit_rate_pct
FROM public.sales_md_targets t
LEFT JOIN public.sales_channel_actuals c
  ON c.md_name = t.md_name AND c.year_month = t.year_month
GROUP BY t.id, t.md_name, t.year_month, t.target_revenue, t.target_profit, t.channel_count, t.growth_rate;

GRANT SELECT ON public.v_sales_md_summary TO authenticated;
GRANT ALL ON public.v_sales_md_summary TO service_role;
