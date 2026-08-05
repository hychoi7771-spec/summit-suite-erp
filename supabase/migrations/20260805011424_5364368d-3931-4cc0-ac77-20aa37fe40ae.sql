REVOKE EXECUTE ON FUNCTION public.sync_task_promotion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_task_promotion() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_task_promotion() TO authenticated;