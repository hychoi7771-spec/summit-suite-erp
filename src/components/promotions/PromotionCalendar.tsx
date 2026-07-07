import { useMemo, useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['bg-blue-100 text-blue-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800', 'bg-cyan-100 text-cyan-800', 'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800'];

function colorFor(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function PromotionCalendar({
  promotions, channels, products, onSelect,
}: {
  promotions: any[]; channels: any[]; products: any[];
  onSelect: (p: any) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const channelMap = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeek; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);

  const monthStart = firstDay.toISOString().slice(0, 10);
  const monthEnd = lastDay.toISOString().slice(0, 10);
  const monthPromos = promotions.filter(p => !(p.end_date < monthStart || p.start_date > monthEnd));

  const promotionsOn = (date: Date) => {
    const iso = date.toISOString().slice(0, 10);
    return monthPromos.filter(p => p.start_date <= iso && p.end_date >= iso);
  };

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">{year}년 {month + 1}월</div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>오늘</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => (
          <div key={i} className="min-h-[100px] border rounded-md p-1.5 bg-card">
            {date && (
              <>
                <div className="text-xs text-muted-foreground mb-1">{date.getDate()}</div>
                <div className="space-y-0.5">
                  {promotionsOn(date).slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={() => onSelect(p)}
                      className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${colorFor(p.product_id)}`}
                      title={`${productMap.get(p.product_id)?.name} · ${channelMap.get(p.channel_id)?.name}`}
                    >
                      {productMap.get(p.product_id)?.name} · {channelMap.get(p.channel_id)?.name}
                    </button>
                  ))}
                  {promotionsOn(date).length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1.5">+{promotionsOn(date).length - 3}건</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
