import { useMemo, useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { AlertTriangle, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAY_MS = 86400000;

function toDate(iso: string) { return new Date(iso + 'T00:00:00'); }
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Monday
  x.setDate(x.getDate() + diff);
  return x;
}
function dayIndex(start: Date, d: Date) {
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  return Math.floor((a.getTime() - start.getTime()) / DAY_MS);
}

const CHANNEL_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900',
  'bg-emerald-100 border-emerald-300 text-emerald-900',
  'bg-violet-100 border-violet-300 text-violet-900',
  'bg-cyan-100 border-cyan-300 text-cyan-900',
  'bg-pink-100 border-pink-300 text-pink-900',
  'bg-orange-100 border-orange-300 text-orange-900',
  'bg-teal-100 border-teal-300 text-teal-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
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
  // Default: previous week + current week (Mon of last week)
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return startOfWeek(d);
  });
  const [mdFilter, setMdFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const days = 14;
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

  const shift = (deltaDays: number) => {
    const d = new Date(rangeStart); d.setDate(d.getDate() + deltaDays); setRangeStart(startOfWeek(d));
  };
  const jumpToday = () => { const d = new Date(); d.setDate(d.getDate() - 7); setRangeStart(startOfWeek(d)); };

  const dayCells = Array.from({ length: days }, (_, i) => new Date(rangeStart.getTime() + i * DAY_MS));

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">
              {rangeStart.getMonth() + 1}/{rangeStart.getDate()} ~ {rangeEnd.getMonth() + 1}/{rangeEnd.getDate()}
            </div>
            <div className="text-[11px] text-muted-foreground">전주·금주 · 총 {filtered.length}건</div>
          </div>
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
          <div className="flex items-center rounded-md border bg-background overflow-hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => shift(-7)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-none border-x px-3 text-xs" onClick={jumpToday}>오늘</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => shift(7)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {rowChannels.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">이 기간에 표시할 행사가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="min-w-[900px]">
            {/* Header: day scale */}
            <div className="flex text-[10px] text-muted-foreground border-b pb-1 mb-1 sticky top-0 bg-card z-10">
              <div className="w-32 shrink-0" />
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
                {dayCells.map((d, i) => {
                  const isToday = i === todayIdx;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isMonday = d.getDay() === 1;
                  return (
                    <div
                      key={i}
                      className={`text-center leading-tight py-1 ${isMonday ? 'border-l border-border' : ''} ${isToday ? 'text-primary font-bold bg-primary/10 rounded-t' : isWeekend ? 'text-rose-500/70' : ''}`}
                    >
                      <div className="text-[9px] opacity-70">{['일','월','화','수','목','금','토'][d.getDay()]}</div>
                      <div className="text-[11px] font-medium">{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            {rowChannels.map(channel => {
              const items = promosByChannel.get(channel.id) || [];
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
              const rowHeight = Math.max(1, lanes.length) * 28 + 12;
              return (
                <div key={channel.id} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors group">
                  <div className="w-32 shrink-0 py-2 pr-2 flex items-center gap-2">
                    <span className={`w-1 h-6 rounded-full ${colorFor(channel.id).split(' ')[1].replace('border-', 'bg-')}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{channel.name}</div>
                      <div className="text-[10px] text-muted-foreground">{items.length}건</div>
                    </div>
                  </div>
                  <div className="flex-1 relative" style={{ height: rowHeight }}>
                    {/* Day column background */}
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
                      {dayCells.map((d, i) => {
                        const isToday = i === todayIdx;
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isMonday = d.getDay() === 1;
                        return (
                          <div
                            key={i}
                            className={`${isMonday ? 'border-l border-border' : ''} ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/30' : ''}`}
                          />
                        );
                      })}
                    </div>
                    {/* Bars snapped to days */}
                    {lanes.map((lane, li) =>
                      lane.map(p => {
                        const sIdx = Math.max(0, dayIndex(rangeStart, toDate(p.start_date)));
                        const eIdx = Math.min(days - 1, dayIndex(rangeStart, toDate(p.end_date)));
                        if (eIdx < 0 || sIdx > days - 1) return null;
                        const left = (sIdx / days) * 100;
                        const width = ((eIdx - sIdx + 1) / days) * 100;
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
                            className={`absolute rounded-md border px-2 text-[11px] font-medium truncate flex items-center gap-1 hover:brightness-95 hover:shadow-md hover:z-20 shadow-sm transition-all ${colorFor(p.channel_id)} ${hasViolation ? 'ring-2 ring-destructive ring-offset-1' : ''} ${hasCheaper && !hasViolation ? 'ring-1 ring-amber-500' : ''}`}
                            style={{ left: `${left}%`, width: `calc(${width}% - 2px)`, top: 6 + li * 28, height: 24 }}
                          >
                            {(hasViolation || hasCheaper) && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{prod?.name}</span>
                            <span className="opacity-70 shrink-0 ml-auto">₩{Math.round(Number(p.promo_price) / 1000)}k</span>
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

      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/30" />오늘</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted" />주말</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm ring-2 ring-destructive" />정책 위반</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm ring-1 ring-amber-500" />저가 겹침</div>
      </div>
    </SectionCard>
  );
}
