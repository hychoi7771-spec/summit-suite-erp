CREATE OR REPLACE FUNCTION public.global_search(_q text)
RETURNS TABLE(kind text, id uuid, title text, subtitle text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'task'::text AS kind, t.id, t.title, t.status::text AS subtitle, t.created_at
      FROM public.tasks t
     WHERE lower(t.title) LIKE '%' || lower(coalesce(_q,'')) || '%'
     ORDER BY t.created_at DESC LIMIT 8
  ) a
  UNION ALL
  SELECT * FROM (
    SELECT 'approval'::text, a.id, a.title, a.type::text, a.created_at
      FROM public.approvals a
     WHERE lower(a.title) LIKE '%' || lower(coalesce(_q,'')) || '%'
     ORDER BY a.created_at DESC LIMIT 8
  ) b
  UNION ALL
  SELECT * FROM (
    SELECT 'notice'::text, n.id, n.title, NULL::text, n.created_at
      FROM public.notices n
     WHERE lower(n.title) LIKE '%' || lower(coalesce(_q,'')) || '%'
     ORDER BY n.created_at DESC LIMIT 8
  ) c
  UNION ALL
  SELECT * FROM (
    SELECT 'file'::text, f.id, f.name, f.category::text, f.created_at
      FROM public.asset_files f
     WHERE lower(f.name) LIKE '%' || lower(coalesce(_q,'')) || '%'
     ORDER BY f.created_at DESC LIMIT 8
  ) d;
$$;

GRANT EXECUTE ON FUNCTION public.global_search(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.global_search(text) FROM anon, PUBLIC;