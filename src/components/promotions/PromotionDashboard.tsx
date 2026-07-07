import { SectionCard } from '@/components/shared/SectionCard';
import { AlertTriangle, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

export function PromotionDashboard({
  promotions, channels, profiles, products, conflictMap,
}: {
  promotions: any[]; channels: any[]; profiles: any[]; products: any[];
  conflictMap: Map<string, any>;
}) {
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const channelMap = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);

  const byChannel = useMemo(() => {
    const m = new Map<string, { name: string; ongoing: number; planned: number; total: number }>();
    channels.forEach(c => m.set(c.id, { name: c.name, ongoing: 0, planned: 0, total: 0 }));
    promotions.forEach(p => {
      const c = m.get(p.channel_id);
      if (!c) return;
      c.total++;
      if (p.status === 'ongoing') c.ongoing++;
      if (p.status === 'planned') c.planned++;
    });
    return [...m.values()].filter(v => v.total > 0).sort((a, b) => b.ongoing - a.ongoing);
  }, [channels, promotions]);

  const byMd = useMemo(() => {
    const m = new Map<string, { name: string; ongoing: number; planned: number; total: number }>();
    promotions.forEach(p => {
      const prof = profileMap.get(p.md_id);
      const key = p.md_id;
      const name = prof?.name_kr || prof?.name || '미지정';
      const cur = m.get(key) || { name, ongoing: 0, planned: 0, total: 0 };
      cur.total++;
      if (p.status === 'ongoing') cur.ongoing++;
      if (p.status === 'planned') cur.planned++;
      m.set(key, cur);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [promotions, profileMap]);

  const violations = useMemo(() => {
    return promotions
      .map(p => ({ p, c: conflictMap.get(p.id) }))
      .filter(x => x.c?.policy_violation)
      .slice(0, 20);
  }, [promotions, conflictMap]);

  const cheaperOverlaps = useMemo(() => {
    return promotions
      .map(p => ({ p, c: conflictMap.get(p.id) }))
      .filter(x => (x.c?.cheaper_overlap_count ?? 0) > 0 && x.p.status !== 'ended' && x.p.status !== 'cancelled')
      .slice(0, 20);
  }, [promotions, conflictMap]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard icon={Users} title="담당 MD별 진행 현황">
        <div className="space-y-2">
          {byMd.length === 0 && <p className="text-sm text-muted-foreground">데이터가 없습니다</p>}
          {byMd.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <span className="font-medium">{m.name}</span>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">진행 {m.ongoing}</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">예정 {m.planned}</Badge>
                <Badge variant="outline">총 {m.total}</Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={TrendingUp} title="채널별 진행 현황">
        <div className="space-y-2">
          {byChannel.length === 0 && <p className="text-sm text-muted-foreground">데이터가 없습니다</p>}
          {byChannel.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <span className="font-medium">{c.name}</span>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">진행 {c.ongoing}</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">예정 {c.planned}</Badge>
                <Badge variant="outline">총 {c.total}</Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={AlertTriangle} title="가격 정책 위반" description="채널별 최저/최고가 정책을 벗어난 행사">
        <div className="space-y-2">
          {violations.length === 0 && <p className="text-sm text-muted-foreground">정책 위반 없음</p>}
          {violations.map(({ p, c }) => (
            <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <div className="min-w-0">
                <div className="font-medium truncate">{productMap.get(p.product_id)?.name} · {channelMap.get(p.channel_id)?.name}</div>
                <div className="text-xs text-muted-foreground">
                  행사가 ₩{Number(p.promo_price).toLocaleString()} · 정책 {c.policy_min ? `≥₩${Number(c.policy_min).toLocaleString()}` : ''} {c.policy_max ? `≤₩${Number(c.policy_max).toLocaleString()}` : ''}
                </div>
              </div>
              <Badge variant="destructive" className="shrink-0">
                {c.policy_violation === 'below_min' ? '최저가 미만' : '최고가 초과'}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={TrendingDown} title="채널 간 가격 겹침" description="동일 품목·기간에 다른 채널이 더 낮은 가격">
        <div className="space-y-2">
          {cheaperOverlaps.length === 0 && <p className="text-sm text-muted-foreground">겹치는 저가 행사 없음</p>}
          {cheaperOverlaps.map(({ p, c }) => (
            <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <div className="min-w-0">
                <div className="font-medium truncate">{productMap.get(p.product_id)?.name} · {channelMap.get(p.channel_id)?.name}</div>
                <div className="text-xs text-muted-foreground">
                  ₩{Number(p.promo_price).toLocaleString()} · {p.start_date} ~ {p.end_date}
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                더 싼 채널 {c.cheaper_overlap_count}건
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
