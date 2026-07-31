import { supabase } from '@/integrations/supabase/client';

/**
 * PostgREST는 1회 요청당 최대 1000행만 반환한다.
 * 페이지네이션으로 전체 행을 조회한다. (기본 최대 2만건)
 */
export async function fetchAllRows(
  table: string,
  columns = '*',
  build?: (q: any) => any,
  maxPages = 20,
): Promise<any[]> {
  const pageSize = 1000;
  const all: any[] = [];
  for (let i = 0; i < maxPages; i++) {
    let q: any = (supabase as any).from(table).select(columns);
    if (build) q = build(q);
    const { data, error } = await q.range(i * pageSize, i * pageSize + pageSize - 1);
    if (error) break;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
