import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CalendarCheck, PieChart, TriangleAlert, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  year: number;
  profiles: any[];
  balanceFor: (profileId: string) => any | undefined;
}

export default function LeaveBalanceOverview({ year, profiles, balanceFor }: Props) {
  const rows = profiles.map(p => {
    const bal = balanceFor(p.id);
    const annual = Number(bal?.total_days ?? 0);
    const monthly = Number(bal?.monthly_total_days ?? 0);
    const used = Number(bal?.used_days ?? 0) + Number(bal?.monthly_used_days ?? 0);
    const total = annual + monthly;
    const remaining = Math.max(total - used, 0);
    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    return { p, bal, annual, monthly, used, total, remaining, pct, isMonthlyBase: monthly > 0 };
  });

  const totalGrant = rows.reduce((s, r) => s + r.total, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
  const usePct = totalGrant > 0 ? Math.round((totalUsed / totalGrant) * 100) : 0;
  const lowCount = rows.filter(r => r.remaining <= 2).length;

  const kpis = [
    { label: '집계 인원', value: `${rows.length}명`, icon: Users, tone: 'text-primary' },
    { label: '총 적립', value: `${totalGrant}일`, icon: CalendarCheck, tone: 'text-accent' },
    { label: '총 사용', value: `${totalUsed}일 (${usePct}%)`, icon: PieChart, tone: 'text-warning' },
    { label: '잔여 2일 이하', value: `${lowCount}명`, icon: TriangleAlert, tone: lowCount > 0 ? 'text-destructive' : 'text-muted-foreground' },
  ];

  const barTone = (pct: number) =>
    pct >= 90 ? 'bg-destructive' : pct >= 65 ? 'bg-warning' : 'bg-primary';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <p className="text-lg font-bold mt-1">{k.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-muted ${k.tone}`}>
                <k.icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map(r => (
          <Card key={r.p.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-[11px]">{r.p.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.p.name_kr}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.p.hire_date ? `${format(parseISO(r.p.hire_date), 'yyyy.MM.dd')} 입사` : '입사일 미등록'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {r.isMonthlyBase ? '월차 기준' : '연차 기준'}
                </Badge>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">남은 휴가</p>
                  <p className={`text-2xl font-bold leading-tight ${r.remaining <= 2 ? 'text-destructive' : 'text-foreground'}`}>
                    {r.remaining}<span className="text-sm font-medium text-muted-foreground ml-0.5">일</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  사용 {r.used}일 / 적립 {r.total}일
                </p>
              </div>

              <Progress value={r.pct} className="h-2" indicatorClassName={barTone(r.pct)} />

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{year}년 기준 · 사용률 {Math.round(r.pct)}%</span>
                <span>
                  다음 적립 {r.bal?.next_grant_date ? format(parseISO(r.bal.next_grant_date), 'yy.MM.dd') : '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
