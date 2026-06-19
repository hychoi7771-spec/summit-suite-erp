import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Users, Search, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

const roleLabels: Record<string, string> = {
  ceo: '대표이사', general_director: '이사', deputy_gm: '부장',
  md: '차장', designer: '대리', staff: '사원',
};
const roleOrder: Record<string, number> = {
  ceo: 0, general_director: 1, deputy_gm: 2, md: 3, designer: 4, staff: 5,
};
const priorityWeight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface Props {
  profiles: any[];
  roles: any[];
  tasks: any[];
}

export default function TeamWorkloadSection({ profiles, roles, tasks }: Props) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const today = startOfDay(new Date());

  const cards = useMemo(() => {
    return profiles
      .map(p => {
        const role = roles.find(r => r.user_id === p.user_id)?.role || 'staff';
        const mine = tasks.filter(t => t.assignee_id === p.id);
        const active = mine.filter(t => t.status !== 'done');
        const inProgress = mine.filter(t => t.status === 'in-progress').length;
        const review = mine.filter(t => t.status === 'review').length;
        const todo = mine.filter(t => t.status === 'todo').length;
        const done = mine.filter(t => t.status === 'done').length;
        const overdue = active.filter(t => {
          if (!t.due_date) return false;
          try { return differenceInDays(parseISO(t.due_date), today) < 0; } catch { return false; }
        }).length;
        const total = mine.length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        const recent = [...active]
          .sort((a, b) => {
            const pw = (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
            if (pw !== 0) return pw;
            if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
          })
          .slice(0, 3);
        return { profile: p, role, todo, inProgress, review, done, overdue, total, active: active.length, progress, recent };
      })
      .filter(c => {
        if (roleFilter !== 'all' && c.role !== roleFilter) return false;
        if (query && !c.profile.name_kr?.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));
  }, [profiles, roles, tasks, query, roleFilter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            담당자별 업무 현황
            <span className="text-xs font-normal text-muted-foreground">({cards.length}명)</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="이름 검색"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="h-8 pl-7 w-36 text-xs"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 직급</SelectItem>
                {Object.entries(roleLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">표시할 담당자가 없습니다</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map(c => (
              <div key={c.profile.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-9 w-9 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{c.profile.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{c.profile.name_kr}</p>
                      <p className="text-xs text-muted-foreground">{roleLabels[c.role] || c.role}</p>
                    </div>
                  </div>
                  {c.overdue > 0 && (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" />지연 {c.overdue}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2 flex-wrap">
                  <span>할일 <b className="text-foreground">{c.todo}</b></span>
                  <span>·</span>
                  <span>진행 <b className="text-foreground">{c.inProgress}</b></span>
                  <span>·</span>
                  <span>검토 <b className="text-foreground">{c.review}</b></span>
                  <span>·</span>
                  <span>완료 <b className="text-foreground">{c.done}</b></span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Progress value={c.progress} className="h-1.5 flex-1" />
                  <span className="text-[11px] text-muted-foreground w-9 text-right">{c.progress}%</span>
                </div>

                {c.recent.length > 0 ? (
                  <ul className="space-y-1.5 mb-3">
                    {c.recent.map(t => {
                      const dday = t.due_date
                        ? differenceInDays(parseISO(t.due_date), today)
                        : null;
                      return (
                        <li key={t.id} className="text-xs flex items-center gap-1.5 min-w-0">
                          {t.priority === 'urgent' && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">긴급</Badge>}
                          {t.priority === 'high' && <Badge className="text-[9px] px-1 py-0 h-4 bg-orange-500 hover:bg-orange-500">높음</Badge>}
                          <span className="truncate flex-1">{t.title}</span>
                          {dday !== null && (
                            <span className={`text-[10px] whitespace-nowrap ${dday < 0 ? 'text-destructive' : dday <= 2 ? 'text-warning' : 'text-muted-foreground'}`}>
                              {dday < 0 ? `D+${Math.abs(dday)}` : dday === 0 ? 'D-Day' : `D-${dday}`}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">진행 중 업무 없음</p>
                )}

                <Link
                  to={`/tasks?assignee=${c.profile.id}`}
                  className="flex items-center justify-center gap-1 text-xs text-primary hover:underline font-medium pt-2 border-t border-border/50"
                >
                  상세 보기 <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
