
ALTER TABLE public.promotions
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN channel_id DROP NOT NULL,
  ALTER COLUMN md_id DROP NOT NULL,
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL,
  ALTER COLUMN promo_price DROP NOT NULL;

DROP POLICY IF EXISTS "promotions insertable by owner or manager" ON public.promotions;
DROP POLICY IF EXISTS "promotions updatable by owner or manager" ON public.promotions;
DROP POLICY IF EXISTS "promotions deletable by owner or manager" ON public.promotions;

CREATE POLICY "promotions insertable by authenticated"
ON public.promotions FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "promotions updatable by owner md creator or manager"
ON public.promotions FOR UPDATE TO authenticated
USING (
  md_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);

CREATE POLICY "promotions deletable by owner md creator or manager"
ON public.promotions FOR DELETE TO authenticated
USING (
  md_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_role(auth.uid(), 'general_director'::app_role)
  OR public.has_role(auth.uid(), 'deputy_gm'::app_role)
);
