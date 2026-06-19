import { ReactNode, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, Loader2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip as RTooltip,
} from 'recharts';

export interface AssetCategory {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
}

export interface AssetItem {
  id: string;
  title: string;
  summary?: string;
  categoryId?: string | null;
  categoryName?: string;
  categoryColor?: string;
  assigneeName?: string;
  completedAt: string; // ISO
  tags?: string[];
}

interface Props {
  source: 'tasks' | 'daily_reports' | 'approvals';
  title: string;
  description: string;
  categories: AssetCategory[];
  items: AssetItem[];
  loading?: boolean;
  renderActions?: (item: AssetItem) => ReactNode;
  onOpenDetail?: (item: AssetItem) => void;
}

export default function AssetLibraryShell({
  source,
  title,
  description,
  categories,
  items,
  loading,
  renderActions,
  onOpenDetail,
}: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | 'all'>('all');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    overview?: string;
    patterns?: string[];
    recommendations?: string[];
  } | null>(null);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (activeCat !== 'all' && it.categoryId !== activeCat) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        it.title.toLowerCase().includes(q) ||
        (it.summary || '').toLowerCase().includes(q) ||
        (it.assigneeName || '').toLowerCase().includes(q) ||
        (it.tags || []).some(t => t.toLowerCase().includes(q))
      );
    });
  }, [items, search, activeCat]);

  const stats = useMemo(() => {
    const byCat = new Map<string, number>();
    const byAssignee = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const it of filtered) {
      const cKey = it.categoryName || '미분류';
      byCat.set(cKey, (byCat.get(cKey) || 0) + 1);
      if (it.assigneeName) byAssignee.set(it.assigneeName, (byAssignee.get(it.assigneeName) || 0) + 1);
      const m = it.completedAt.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) || 0) + 1);
    }
    const months: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key.slice(5), count: byMonth.get(key) || 0 });
    }
    const topAssignees = Array.from(byAssignee.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { byCat, topAssignees, months };
  }, [filtered]);

  const requestAISummary = async () => {
    if (filtered.length === 0) {
      toast({ title: '요약할 자산이 없습니다.', variant: 'destructive' });
      return;
    }
    setAiOpen(true);
    setAiLoading(true);
    setAiResult(null);
    try {
      const items = filtered.slice(0, 50).map(i => ({
        id: i.id,
        title: i.title,
        summary: i.summary?.slice(0, 400) ?? '',
        category: i.categoryName ?? '미분류',
      }));
      const { data, error } = await supabase.functions.invoke('summarize-assets', {
        body: { source, items },
      });
      if (error) throw error;
      setAiResult(data || null);
    } catch (e: any) {
      toast({ title: 'AI 요약 실패', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 self-start md:self-auto"
          onClick={requestAISummary}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI 요약·인사이트
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-3 rounded-xl border bg-card">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제목·내용·태그·담당자 통합 검색"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCat('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              activeCat === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
            }`}
          >
            전체 ({items.length})
          </button>
          {categories.map(c => {
            const count = items.filter(i => i.categoryId === c.id).length;
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(active ? 'all' : c.id)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border"
                style={
                  active
                    ? { backgroundColor: c.color, color: 'white', borderColor: c.color }
                    : { color: c.color, borderColor: `${c.color}55` }
                }
              >
                {c.icon && <span>{c.icon}</span>}
                <span>{c.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <BarChart3 className="h-3.5 w-3.5" /> 카테고리 분포
          </div>
          <div className="space-y-1">
            {Array.from(stats.byCat.entries()).slice(0, 5).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="truncate">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
            {stats.byCat.size === 0 && <p className="text-xs text-muted-foreground">데이터 없음</p>}
          </div>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-2">담당자 TOP 3</div>
          <div className="space-y-1">
            {stats.topAssignees.map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="truncate">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
            {stats.topAssignees.length === 0 && <p className="text-xs text-muted-foreground">데이터 없음</p>}
          </div>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="text-xs text-muted-foreground mb-2">최근 12개월 추이</div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.months}>
                <XAxis dataKey="month" hide />
                <RTooltip
                  contentStyle={{ fontSize: 11, padding: 4, borderRadius: 6 }}
                  labelStyle={{ fontSize: 11 }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI summary panel */}
      {aiOpen && (
        <div className="p-4 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI 요약 · 인사이트
            </div>
            <button onClick={() => setAiOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
              닫기
            </button>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="h-4 w-4 animate-spin" /> 분석 중...
            </div>
          )}
          {aiResult && (
            <div className="space-y-3 text-sm">
              {aiResult.overview && <p className="whitespace-pre-wrap leading-relaxed">{aiResult.overview}</p>}
              {aiResult.patterns && aiResult.patterns.length > 0 && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">패턴</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {aiResult.patterns.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">추천 액션</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {aiResult.recommendations.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> 불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground rounded-xl border bg-card">
          조건에 맞는 자산이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-xl border bg-card hover:shadow-md transition cursor-pointer"
              style={{ borderLeftWidth: 4, borderLeftColor: item.categoryColor || '#94a3b8' }}
              onClick={() => onOpenDetail?.(item)}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {item.categoryName && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${item.categoryColor || '#94a3b8'}22`,
                      color: item.categoryColor || '#475569',
                    }}
                  >
                    {item.categoryName}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(item.completedAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">{item.title}</h3>
              {item.summary && (
                <p className="text-xs text-muted-foreground line-clamp-3 mb-2 whitespace-pre-wrap">
                  {item.summary}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className="text-[11px] text-muted-foreground truncate">
                  {item.assigneeName || '미지정'}
                </span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  {renderActions?.(item)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
