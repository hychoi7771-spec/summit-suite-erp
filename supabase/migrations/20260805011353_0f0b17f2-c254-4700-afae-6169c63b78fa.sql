CREATE OR REPLACE FUNCTION public.sync_task_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'tasks' THEN
    IF NEW.promotion_id IS NOT NULL AND (OLD.promotion_id IS DISTINCT FROM NEW.promotion_id) THEN
      UPDATE public.promotions
      SET task_id = NEW.id
      WHERE id = NEW.promotion_id
        AND task_id IS DISTINCT FROM NEW.id;
    END IF;
    IF NEW.promotion_id IS NULL AND OLD.promotion_id IS NOT NULL THEN
      UPDATE public.promotions
      SET task_id = NULL
      WHERE id = OLD.promotion_id
        AND task_id = NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'promotions' THEN
    IF NEW.task_id IS NOT NULL AND (OLD.task_id IS DISTINCT FROM NEW.task_id) THEN
      UPDATE public.tasks
      SET promotion_id = NEW.id
      WHERE id = NEW.task_id
        AND promotion_id IS DISTINCT FROM NEW.id;
    END IF;
    IF NEW.task_id IS NULL AND OLD.task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET promotion_id = NULL
      WHERE id = OLD.task_id
        AND promotion_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_task_promotion ON public.tasks;
CREATE TRIGGER sync_task_promotion
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_promotion();

DROP TRIGGER IF EXISTS sync_promotion_task ON public.promotions;
CREATE TRIGGER sync_promotion_task
  AFTER INSERT OR UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_promotion();

GRANT EXECUTE ON FUNCTION public.sync_task_promotion() TO authenticated;