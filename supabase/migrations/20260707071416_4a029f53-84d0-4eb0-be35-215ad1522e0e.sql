
ALTER TABLE public.task_categories ADD COLUMN IF NOT EXISTS system_slug text UNIQUE;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_promotion_id ON public.tasks(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotions_task_id ON public.promotions(task_id);

INSERT INTO public.task_categories (name, icon, color, sort_order, system_slug)
SELECT '행사', 'PartyPopper', '#d946ef', 999, 'promotion'
WHERE NOT EXISTS (SELECT 1 FROM public.task_categories WHERE system_slug = 'promotion');

-- Protect system categories from delete/rename
CREATE OR REPLACE FUNCTION public.protect_system_categories()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.system_slug IS NOT NULL THEN
    RAISE EXCEPTION '시스템 카테고리는 삭제할 수 없습니다.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.system_slug IS NOT NULL AND NEW.system_slug IS DISTINCT FROM OLD.system_slug THEN
    RAISE EXCEPTION '시스템 카테고리 식별자는 변경할 수 없습니다.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS task_categories_protect_system ON public.task_categories;
CREATE TRIGGER task_categories_protect_system
  BEFORE UPDATE OR DELETE ON public.task_categories
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_categories();
