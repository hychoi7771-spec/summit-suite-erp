import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopRow {
  to_user_id: string;
  count: number;
  name: string;
}

export function KudosWeeklyTopWidget() {
  const [top, setTop] = useState<TopRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from('kudos')
        .select('to_user_id, to:profiles!kudos_to_user_id_fkey(name_kr,name)')
        .gte('created_at', weekAgo);
      const counts: Record<string, { count: number; name: string }> = {};
      (data as any[] | null)?.forEach(r => {
        const name = r.to?.name_kr || r.to?.name || '직원';
        if (!counts[r.to_user_id]) counts[r.to_user_id] = { count: 0, name };
        counts[r.to_user_id].count += 1;
      });
      const arr = Object.entries(counts)
        .map(([to_user_id, v]) => ({ to_user_id, count: v.count, name: v.name }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      setTop(arr);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Link
      to="/kudos"
      className="block rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/20 p-4 hover:shadow-md transition"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-rose-500" />
        <h3 className="text-sm font-semibold">이번 주 칭찬 Top 3</h3>
      </div>
      {loading ? (
        <div className="h-16 animate-pulse bg-background/40 rounded" />
      ) : top.length === 0 ? (
        <p className="text-xs text-muted-foreground">이번 주 칭찬을 첫 번째로 남겨보세요</p>
      ) : (
        <ol className="space-y-1.5">
          {top.map((t, i) => (
            <li key={t.to_user_id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="text-base">{['🥇', '🥈', '🥉'][i]}</span>
                <span className="font-medium">{t.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">칭찬 {t.count}개</span>
            </li>
          ))}
        </ol>
      )}
    </Link>
  );
}
