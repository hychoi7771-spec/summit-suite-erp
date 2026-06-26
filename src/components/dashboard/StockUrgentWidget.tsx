import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PackageX, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

const urgencyMeta: Record<string, { label: string; cls: string }> = {
  high:   { label: '긴급', cls: 'bg-destructive text-destructive-foreground' },
  medium: { label: '주의', cls: 'bg-warning text-warning-foreground' },
  low:    { label: '관찰', cls: 'bg-muted text-muted-foreground' },
};

export default function StockUrgentWidget() {
  const [items, setItems] = useState<any[]>([]);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('stock_urgent_alerts')
      .select('*')
      .eq('status', 'active')
      .order('urgency', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(5);
    setItems(data || []);
  };

  useEffect(() => {
    fetchAlerts();
    const ch = supabase
      .channel('stock-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_urgent_alerts' }, () => fetchAlerts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items.length === 0) return null;

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
            </span>
            <PackageX className="h-4 w-4 text-destructive" />
            재고임박 판매 독려
            <Badge variant="destructive" className="ml-1 h-5">{items.length}</Badge>
          </CardTitle>
          <Link to="/stock-alerts">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              전체 보기 <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 max-h-[120px] overflow-y-auto pr-1">
          {items.map((a: any) => {
            const meta = urgencyMeta[a.urgency] || urgencyMeta.medium;
            let dDay: string | null = null;
            if (a.expiry_date) {
              try {
                const d = differenceInDays(parseISO(a.expiry_date), new Date());
                dDay = d < 0 ? `D+${-d}` : d === 0 ? 'D-DAY' : `D-${d}`;
              } catch {}
            }
            return (
              <Link to="/stock-alerts" key={a.id}
                className="flex flex-col gap-1 p-2 rounded-md bg-background border border-border/60 hover:border-destructive/40 hover:shadow-sm transition-all min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <Badge className={`${meta.cls} text-[10px] h-4 px-1.5 shrink-0`}>{meta.label}</Badge>
                  {dDay && <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">{dDay}</Badge>}
                </div>
                <div className="font-medium text-xs leading-tight line-clamp-2 min-h-[2rem]">{a.product_name}</div>
                {a.stock_qty != null && <div className="text-[10px] text-muted-foreground">{a.stock_qty}개</div>}
              </Link>
            );
          })}
        </div>
      </CardContent>

    </Card>
  );
}
