import { useMemo } from 'react';
import { PromotionTimeline } from './PromotionTimeline';
import { PromotionMatrix } from './PromotionMatrix';
import { AlertTriangle, TrendingUp, Store, Users, Percent } from 'lucide-react';

function InfoCard({ icon: Icon, label, value, sub, tint }: any) {
  return (
    <div className={`rounded-xl border bg-card p-4 flex items-start gap-3 hover:shadow-sm transition-shadow`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
        <div className="text-xl font-bold leading-tight mt-0.5 truncate">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function MiniBarChart({ items, colorClass }: { items: { label: string; value: number }[]; colorClass: string }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="space-y-1.5">
      {items.slice(0, 5).map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-16 truncate text-muted-foreground shrink-0">{it.label}</div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <div className="w-6 text-right font-semibold tabular-nums">{it.value}</div>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">데이터 없음</p>}
    </div>
  );
}

export function PromotionDashboard({
  promotions, channels, profiles, products, conflictMap,
  onSelect, onFilterList,
}: {
  promotions: any[]; channels: any[]; profiles: any[]; products: any[];
  conflictMap: Map<string, any>;
  onSelect: (p: any) => void;
  onFilterList: (filters: { mdId?: string; channelId?: string }) => void;
}) {
  const alerts = useMemo(() => {
    let vio = 0, cheap = 0;
    conflictMap.forEach((c: any) => {
      if (c.policy_violation) vio++;
      if ((c.cheaper_overlap_count ?? 0) > 0) cheap++;
    });
    return { vio, cheap };
  }, [conflictMap]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = promotions.filter(p => p.status !== 'cancelled');
    const ongoing = active.filter(p => p.start_date <= today && p.end_date >= today);
    const planned = active.filter(p => p.start_date > today);

    const channelCounts = new Map<string, number>();
    ongoing.forEach(p => channelCounts.set(p.channel_id, (channelCounts.get(p.channel_id) || 0) + 1));
    const topChannels = channels
      .map(c => ({ label: c.name, value: channelCounts.get(c.id) || 0 }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);

    const mdCounts = new Map<string, number>();
    ongoing.forEach(p => p.md_id && mdCounts.set(p.md_id, (mdCounts.get(p.md_id) || 0) + 1));
    const topMds = profiles
      .map(p => ({ label: p.name_kr || p.name, value: mdCounts.get(p.id) || 0 }))
      .filter(m => m.value > 0)
      .sort((a, b) => b.value - a.value);

    const discounts = ongoing.map(p => Number(p.discount_rate) || 0).filter(d => d > 0);
    const avgDiscount = discounts.length ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0;

    return { ongoing: ongoing.length, planned: planned.length, topChannels, topMds, avgDiscount, activeChannels: channelCounts.size };
  }, [promotions, channels, profiles]);

  return (
    <div className="space-y-4">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard icon={TrendingUp} label="진행중 행사" value={stats.ongoing} sub={`예정 ${stats.planned}건 대기`} tint="bg-emerald-100 text-emerald-700" />
        <InfoCard icon={Store} label="활성 채널" value={stats.activeChannels} sub={`전체 ${channels.length}개 중`} tint="bg-blue-100 text-blue-700" />
        <InfoCard icon={Percent} label="평균 할인율" value={`${stats.avgDiscount}%`} sub="진행중 기준" tint="bg-violet-100 text-violet-700" />
        <InfoCard icon={Users} label="담당 MD" value={stats.topMds.length} sub={stats.topMds[0] ? `1위 ${stats.topMds[0].label} (${stats.topMds[0].value}건)` : '데이터 없음'} tint="bg-amber-100 text-amber-700" />
      </div>

      {/* 미니 인포그래픽 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">채널별 진행중</div>
            <div className="text-[11px] text-muted-foreground">TOP 5</div>
          </div>
          <MiniBarChart items={stats.topChannels} colorClass="bg-gradient-to-r from-blue-400 to-blue-600" />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">MD별 진행중</div>
            <div className="text-[11px] text-muted-foreground">TOP 5</div>
          </div>
          <MiniBarChart items={stats.topMds} colorClass="bg-gradient-to-r from-violet-400 to-violet-600" />
        </div>
      </div>

      {(alerts.vio > 0 || alerts.cheap > 0) && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <div className="flex-1 text-amber-900">
            {alerts.vio > 0 && <span className="mr-3"><b>정책 위반 {alerts.vio}건</b></span>}
            {alerts.cheap > 0 && <span>저가 겹침 {alerts.cheap}건</span>}
          </div>
          <button
            className="text-xs font-medium text-amber-700 hover:underline"
            onClick={() => onFilterList({})}
          >
            목록에서 확인 →
          </button>
        </div>
      )}

      <PromotionTimeline
        promotions={promotions}
        channels={channels}
        products={products}
        profiles={profiles}
        conflictMap={conflictMap}
        onSelect={onSelect}
      />

      <PromotionMatrix
        promotions={promotions}
        channels={channels}
        profiles={profiles}
        conflictMap={conflictMap}
        onCellClick={(mdId, channelId) => onFilterList({ mdId, channelId })}
      />
    </div>
  );
}
