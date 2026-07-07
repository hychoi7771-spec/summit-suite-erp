
-- Enums
CREATE TYPE public.channel_type AS ENUM ('online', 'offline');
CREATE TYPE public.promotion_status AS ENUM ('planned', 'ongoing', 'ended', 'cancelled');
CREATE TYPE public.promotion_kind AS ENUM ('coupon', 'deal', 'plan_exhibit', 'live', 'timesale', 'bundle', 'other');

-- =============== sales_channels ===============
CREATE TABLE public.sales_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type public.channel_type NOT NULL DEFAULT 'online',
  default_md_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channels TO authenticated;
GRANT ALL ON public.sales_channels TO service_role;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels viewable by authenticated" ON public.sales_channels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels manageable by managers" ON public.sales_channels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR public.has_role(auth.uid(), 'deputy_gm'))
  WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR public.has_role(auth.uid(), 'deputy_gm'));

CREATE TRIGGER update_sales_channels_updated_at
  BEFORE UPDATE ON public.sales_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== channel_price_policies ===============
CREATE TABLE public.channel_price_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.sales_channels(id) ON DELETE CASCADE, -- NULL = 전 채널 공통
  min_price numeric,
  max_price numeric,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, channel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_price_policies TO authenticated;
GRANT ALL ON public.channel_price_policies TO service_role;
ALTER TABLE public.channel_price_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price policies viewable by authenticated" ON public.channel_price_policies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "price policies manageable by managers" ON public.channel_price_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR public.has_role(auth.uid(), 'deputy_gm'))
  WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR public.has_role(auth.uid(), 'deputy_gm'));

CREATE TRIGGER update_channel_price_policies_updated_at
  BEFORE UPDATE ON public.channel_price_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== promotions ===============
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.sales_channels(id) ON DELETE RESTRICT,
  md_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text,
  kind public.promotion_kind NOT NULL DEFAULT 'other',
  placement text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  regular_price numeric,
  promo_price numeric NOT NULL,
  planned_qty integer,
  stock_qty integer,
  expected_revenue numeric,
  actual_revenue numeric,
  competitor_price numeric,
  market_lowest_price numeric,
  monitoring_note text,
  memo text,
  status public.promotion_status NOT NULL DEFAULT 'planned',
  status_override boolean NOT NULL DEFAULT false,
  attachment_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_promotions_dates ON public.promotions (start_date, end_date);
CREATE INDEX idx_promotions_product ON public.promotions (product_id);
CREATE INDEX idx_promotions_channel ON public.promotions (channel_id);
CREATE INDEX idx_promotions_md ON public.promotions (md_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions viewable by authenticated" ON public.promotions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "promotions insertable by owner or manager" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (
    md_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
    OR public.has_role(auth.uid(), 'deputy_gm')
  );
CREATE POLICY "promotions updatable by owner or manager" ON public.promotions
  FOR UPDATE TO authenticated
  USING (
    md_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
    OR public.has_role(auth.uid(), 'deputy_gm')
  );
CREATE POLICY "promotions deletable by owner or manager" ON public.promotions
  FOR DELETE TO authenticated
  USING (
    md_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'general_director')
    OR public.has_role(auth.uid(), 'deputy_gm')
  );

-- Auto status trigger
CREATE OR REPLACE FUNCTION public.promotions_auto_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  today date := CURRENT_DATE;
BEGIN
  IF NEW.status_override THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF today < NEW.start_date THEN
    NEW.status := 'planned';
  ELSIF today > NEW.end_date THEN
    NEW.status := 'ended';
  ELSE
    NEW.status := 'ongoing';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER promotions_status_biu
  BEFORE INSERT OR UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.promotions_auto_status();

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== promotion_conflicts view ===============
CREATE OR REPLACE VIEW public.promotion_conflicts AS
SELECT
  p.id AS promotion_id,
  CASE
    WHEN pol.min_price IS NOT NULL AND p.promo_price < pol.min_price THEN 'below_min'
    WHEN pol.max_price IS NOT NULL AND p.promo_price > pol.max_price THEN 'above_max'
    ELSE NULL
  END AS policy_violation,
  pol.min_price AS policy_min,
  pol.max_price AS policy_max,
  (
    SELECT COUNT(*) FROM public.promotions o
    WHERE o.product_id = p.product_id
      AND o.id <> p.id
      AND o.status <> 'cancelled'
      AND o.start_date <= p.end_date
      AND o.end_date >= p.start_date
      AND o.promo_price < p.promo_price
  ) AS cheaper_overlap_count
FROM public.promotions p
LEFT JOIN LATERAL (
  SELECT * FROM public.channel_price_policies cp
  WHERE cp.product_id = p.product_id
    AND (cp.channel_id = p.channel_id OR cp.channel_id IS NULL)
  ORDER BY (cp.channel_id = p.channel_id) DESC NULLS LAST
  LIMIT 1
) pol ON true;

GRANT SELECT ON public.promotion_conflicts TO authenticated;
