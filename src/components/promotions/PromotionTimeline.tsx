import { useMemo, useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAY_MS = 86400000;

function toDate(iso: string) { return new Date(iso + 'T00:00:00'); }
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }
function dayIndex(d1: Date, d2: Date) { return Math.round((d2.getTime() - d1.getTime()) / DAY_MS); }

const CHANNEL_COLORS = [
  'bg-blue-200/70', 'bg-emerald-200/70', 'bg-violet-200/70', 'bg-cyan-200/70',
  'bg-pink-200/70', 'bg-orange-200/70', 'bg-teal-200/70', 'bg-indigo-200/70',
];

function colorFor(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CHANNEL_COLORS[h % CHANNEL_COLORS.length];
}

export function PromotionTimeline({
  promotions, channels, products, profiles, conflictMap, onSelect,
}: {
  promotions: any[]; channels: any[]; products: any[]; profiles: any[];
  conflictMap: Map<string, any>;
  onSelect: (p: any) => void;
}) {
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
  });
  const [mdFilter, setMdFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const days = 35;
  const rangeEnd = new Date(rangeStart.getTime() + (days - 1) * DAY_MS);
  const startISO = dateStr(rangeStart);
  const endISO = dateStr(rangeEnd);

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);
  const channelMap = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);

  const filtered = useMemo(() => promotions.filter(p => {
    if (p.end_date < startISO || p.start_date > endISO) return false;
    if (p.status === 'cancelled') return false;
    if (mdFilter !== 'all' && p.md_id !== mdFilter) return false;
    if (typeFilter !== 'all') {
      const ch = channelMap.get(p.channel_id);
      if (ch?.type !== typeFilter) return false;
    }
    return true;
  }), [promotions, startISO, endISO, mdFilter, typeFilter, channelMap]);

  // Rows: only channels that have promotions in range, sorted by ongoing count
  const rowChannels = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach(p => counts.set(p.channel_id, (counts.get(p.channel_id) || 0) + 1));
    return channels
      .filter(c => counts.has(c.id))
      .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
  }, [channels, filtered]);

  const promosByChannel = useMemo(() => {
    const m = new Map<string, any[]>();
    filtered.forEach(p => {
      const list = m.get(p.channel_id) || [];
      list.push(p);
      m.set(p.channel_id, list);
    });
    return m;
  }, [filtered]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIdx = dayIndex(rangeStart, today);

  const shift = (delta: number) => {
    const d = new Date(rangeStart); d.setDate(d.getDate() + delta); setRangeStart(d);
  };

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold">
          {rangeStart.getMonth() + 1}/{rangeStart.getDate()} ~ {rangeEnd.getMonth() + 1}/{rangeEnd.getDate()}
          <span className="text-muted-foreground font-normal ml-2">({filtered.length}건)</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mdFilter} onValueChange={setMdFilter}>
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 MD</SelectItem>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="online">온라인</SelectItem>
              <SelectItem value="offline">오프라인</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-7)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); setRangeStart(d); }}>오늘</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(7)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {rowChannels.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">이 기간에 표시할 행사가 없습니다</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header day scale */}
            <div className="flex text-[10px] text-muted-foreground border-b pb-1 mb-1 sticky top-0 bg-card">
              <div className="w-32 shrink-0" />
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
                {Array.from({ length: days }, (_, i) => {
                  const d = new Date(rangeStart.getTime() + i * DAY_MS);
                  const isToday = i === todayIdx;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const showLabel = d.getDate() === 1 || i === 0 || i % 7 === 0;
                  return (
                    <div key={i} className={`text-center border-l first:border-l-0 ${isToday ? 'text-primary font-bold' : ''} ${isWeekend ? 'bg-muted/30' : ''}`}>
                      {showLabel ? `${d.getMonth() + 1}/${d.getDate()}` : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            {rowChannels.map(channel => {
              const items = promosByChannel.get(channel.id) || [];
              // Assign lanes to avoid overlap
              const lanes: any[][] = [];
              items.sort((a, b) => a.start_date.localeCompare(b.start_date));
              items.forEach((p) => {
                let placed = false;
                for (const lane of lanes) {
                  if (lane.every(o => o.end_date < p.start_date || o.start_date > p.end_date)) {
                    lane.push(p); placed = true; break;
                  }
                }
                if (!placed) lanes.push([p]);
              });
              const rowHeight = Math.max(1, lanes.length) * 26 + 10;
              return (
                <div key={channel.id} className="flex border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <div className="w-32 shrink-0 py-2 pr-2 text-xs font-medium truncate">{channel.name}</div>
                  <div className="flex-1 relative" style={{ height: rowHeight }}>
                    {/* Weekend & today background */}
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
                      {Array.from({ length: days }, (_, i) => {
                        const d = new Date(rangeStart.getTime() + i * DAY_MS);
                        const isToday = i === todayIdx;
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return <div key={i} className={`border-l first:border-l-0 border-border/40 ${isWeekend ? 'bg-muted/20' : ''} ${isToday ? 'bg-primary/5' : ''}`} />;
                      })}
                    </div>
                    {/* Today vertical line */}
                    {todayIdx >= 0 && todayIdx < days && (
                      <div className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none" style={{ left: `${((todayIdx + 0.5) / days) * 100}%` }} />
                    )}
                    {/* Bars */}
                    {lanes.map((lane, li) =>
                      lane.map(p => {
                        const s = Math.max(0, dayIndex(rangeStart, toDate(p.start_date)));
                        const e = Math.min(days - 1, dayIndex(rangeStart, toDate(p.end_date)));
                        const left = (s / days) * 100;
                        const width = ((e - s + 1) / days) * 100;
                        const conflict = conflictMap.get(p.id);
                        const hasViolation = !!conflict?.policy_violation;
                        const hasCheaper = (conflict?.cheaper_overlap_count ?? 0) > 0;
                        const prod = productMap.get(p.product_id);
                        const md = profileMap.get(p.md_id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => onSelect(p)}
                            title={`${prod?.name} · ${md?.name_kr || md?.name}\n₩${Number(p.promo_price).toLocaleString()} · ${p.start_date} ~ ${p.end_date}${hasViolation ? '\n⚠ 정책 위반' : ''}${hasCheaper ? `\n⚠ 저가 겹침 ${conflict.cheaper_overlap_count}` : ''}`}
                            className={`absolute rounded px-1.5 text-[10px] font-medium text-slate-800 truncate flex items-center gap-1 hover:brightness-95 hover:z-20 shadow-sm ${colorFor(p.channel_id)} ${hasViolation ? 'ring-2 ring-destructive' : ''} ${hasCheaper && !hasViolation ? 'ring-1 ring-amber-500' : ''}`}
                            style={{ left: `${left}%`, width: `${width}%`, top: 5 + li * 26, height: 22 }}
                          >
                            {(hasViolation || hasCheaper) && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
                            <span className="truncate">{prod?.name}</span>
                            <span className="text-slate-600 shrink-0">₩{Math.round(Number(p.promo_price) / 1000)}k</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
