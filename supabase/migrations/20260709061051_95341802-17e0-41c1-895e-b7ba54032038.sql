
ALTER VIEW public.v_sales_md_summary SET (security_invoker = true);
REVOKE EXECUTE ON FUNCTION public.is_sales_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_sales_admin(uuid) TO authenticated, service_role;
