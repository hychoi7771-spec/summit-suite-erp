CREATE OR REPLACE FUNCTION public.global_search(_q text)
RETURNS TABLE(kind text, id uuid, title text, subtitle text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (SELECT '%' || lower(coalesce(_q, '')) || '%' AS p)
  SELECT * FROM (
    SELECT 'task'::text AS kind, t.id, t.title, t.status::text AS subtitle, t.created_at
      FROM public.tasks t, q
     WHERE lower(t.title) LIKE q.p
        OR lower(coalesce(t.description, '')) LIKE q.p
        OR lower(coalesce(t.project_name, '')) LIKE q.p
     ORDER BY t.created_at DESC LIMIT 8
  ) a
  UNION ALL
  SELECT * FROM (
    SELECT 'approval'::text, a.id, a.title, a.type::text, a.created_at
      FROM public.approvals a, q
     WHERE lower(a.title) LIKE q.p
        OR lower(coalesce(a.content, '')) LIKE q.p
     ORDER BY a.created_at DESC LIMIT 8
  ) b
  UNION ALL
  SELECT * FROM (
    SELECT 'notice'::text, n.id, n.title, NULL::text, n.created_at
      FROM public.notices n, q
     WHERE lower(n.title) LIKE q.p
        OR lower(coalesce(n.content, '')) LIKE q.p
     ORDER BY n.created_at DESC LIMIT 8
  ) c
  UNION ALL
  SELECT * FROM (
    SELECT 'file'::text, f.id, f.name, f.category::text, f.created_at
      FROM public.asset_files f, q
     WHERE lower(f.name) LIKE q.p
        OR lower(coalesce(f.category, '')) LIKE q.p
     ORDER BY f.created_at DESC LIMIT 8
  ) d
  UNION ALL
  SELECT * FROM (
    SELECT 'meeting'::text, m.id, m.title, to_char(m.date, 'YYYY-MM-DD'), m.created_at
      FROM public.meetings m, q
     WHERE lower(m.title) LIKE q.p
        OR lower(coalesce(m.notes, '')) LIKE q.p
        OR lower(coalesce(m.goal, '')) LIKE q.p
     ORDER BY m.created_at DESC LIMIT 8
  ) e
  UNION ALL
  SELECT * FROM (
    SELECT 'product'::text, p.id, p.name, p.stage::text, p.created_at
      FROM public.products p, q
     WHERE lower(p.name) LIKE q.p
        OR lower(coalesce(p.description, '')) LIKE q.p
     ORDER BY p.created_at DESC LIMIT 8
  ) f
  UNION ALL
  SELECT * FROM (
    SELECT 'design'::text, d2.id, d2.title, d2.status::text, d2.created_at
      FROM public.design_reviews d2, q
     WHERE lower(d2.title) LIKE q.p
        OR lower(coalesce(d2.description, '')) LIKE q.p
     ORDER BY d2.created_at DESC LIMIT 8
  ) g
  UNION ALL
  SELECT * FROM (
    SELECT 'expense'::text, x.id,
           coalesce(nullif(x.description, ''), x.category::text) AS title,
           to_char(x.amount, 'FM999,999,999') || '원' AS subtitle,
           x.created_at
      FROM public.expenses x, q
     WHERE lower(coalesce(x.description, '')) LIKE q.p
        OR lower(x.category::text) LIKE q.p
     ORDER BY x.created_at DESC LIMIT 8
  ) h;
$$;