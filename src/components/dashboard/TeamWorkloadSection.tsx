import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Search, AlertTriangle, Flame, Leaf, Activity, UserPlus2, Loader2 } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  ceo: '대표이사', general_director: '이사', managing_director: '실장', deputy_gm: '부장',
  md: '차장', designer: '대리', assistant_manager: '주임', staff: '사원',
};
const roleOrder: Record<string, number> = {
  ceo: 0, general_director: 1, managing_director: 2, deputy_gm: 3, md: 4, designer: 5, assistant_manager: 6, staff: 7,
};
const priorityWeight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface Props {
  profiles: any[];
  roles: any[];
  tasks: any[];
  reportedTodayIds?: Set<string>;
  onLeaveIds?: Set<string>;
}

export default function TeamWorkloadSection({ profiles, roles, tasks, reportedTodayIds, onLeaveIds }: Props) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const today = startOfDay(new Date());

  const reassign = async (task: any, newAssigneeId: string, newAssigneeName: string) => {
    if (!profile?.id) { toast.error('로그인이 필요합니다'); return; }
    if (task.assignee_id === newAssigneeId) { toast.info('이미 해당 담당자입니다'); return; }
    setReassigningId(task.id);
    const oldId = task.assignee_id || null;
    const { error } = await supabase.from('tasks').update({ assignee_id: newAssigneeId }).eq('id', task.id);
    if (error) {
      toast.error('재배치 실패: ' + error.message);
      setReassigningId(null);
      return;
    }
    await supabase.from('task_history').insert({
      task_id: task.id,
      user_id: profile.id,
      field_name: 'assignee_id',
      old_value: oldId,
      new_value: newAssigneeId,
    });
    if (newAssigneeId && newAssigneeId !== profile.id) {
      const targetUserId = profiles.find(p => p.id === newAssigneeId)?.user_id;
      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'task',
          title: '업무가 재배치되었습니다',
          message: `「${task.title}」 업무가 회원님께 배정되었습니다`,
          related_id: task.id,
        });
      }
    }
    toast.success(`「${task.title}」 → ${newAssigneeName}`);
    setReassigningId(null);
  };


  const { cards, avgLoad } = useMemo(() => {
    const base = profiles.map(p => {
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
      const urgent = active.filter(t => t.priority === 'urgent').length;
      const high = active.filter(t => t.priority === 'high').length;
      // 가중 업무량 점수: 활성 업무 + 긴급×3 + 높음×2 + 지연×2
      const loadScore = active.length + urgent * 3 + high * 2 + overdue * 2;
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
      return { profile: p, role, todo, inProgress, review, done, overdue, urgent, high, total, active: active.length, loadScore, progress, recent };
    });
    const activeBase = base.filter(c => !onLeaveIds?.has(c.profile.id));
    const avg = activeBase.length > 0
      ? activeBase.reduce((s, c) => s + c.loadScore, 0) / activeBase.length
      : 0;
    const filtered = base
      .filter(c => {
        if (roleFilter !== 'all' && c.role !== roleFilter) return false;
        if (query && !c.profile.name_kr?.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.loadScore - a.loadScore);
    return { cards: filtered, avgLoad: avg };
  }, [profiles, roles, tasks, query, roleFilter, onLeaveIds]);

  const loadLevel = (score: number, isOnLeave: boolean) => {
    if (isOnLeave) return null;
    const high = Math.max(avgLoad * 1.5, 6);
    const low = Math.max(avgLoad * 0.5, 1);
    if (score >= high) return { label: '집중', cls: 'bg-red-500 hover:bg-red-500 text-white', icon: Flame };
    if (score <= low) return { label: '원활', cls: 'bg-emerald-600 hover:bg-emerald-600 text-white', icon: Leaf };
    return { label: '양호', cls: 'bg-blue-500 hover:bg-blue-500 text-white', icon: Activity };
  };

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
                  <div className="flex flex-col items-end gap-1">
                    {(() => {
                      const isLeave = !!onLeaveIds?.has(c.profile.id);
                      const lvl = loadLevel(c.loadScore, isLeave);
                      if (isLeave) {
                        return <Badge className="text-[10px] bg-orange-500 hover:bg-orange-500">휴가중</Badge>;
                      }
                      return lvl ? (
                        <Badge className={`text-[10px] gap-1 ${lvl.cls}`} title={`업무 부하 점수 ${c.loadScore} (팀 평균 ${avgLoad.toFixed(1)})`}>
                          <lvl.icon className="h-3 w-3" />{lvl.label} {c.loadScore}
                        </Badge>
                      ) : null;
                    })()}
                    {reportedTodayIds !== undefined && !onLeaveIds?.has(c.profile.id) && (
                      reportedTodayIds.has(c.profile.id)
                        ? <Badge variant="outline" className="text-[10px] border-emerald-600 text-emerald-700">보고완료</Badge>
                        : <Badge variant="outline" className="text-[10px]">보고미작성</Badge>
                    )}
                    {c.overdue > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" />마감임박 {c.overdue}
                      </Badge>
                    )}
                  </div>
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 shrink-0"
                                title="재배치"
                                disabled={reassigningId === t.id}
                              >
                                {reassigningId === t.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <UserPlus2 className="h-3 w-3" />}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-1" align="end">
                              <p className="text-[10px] text-muted-foreground px-2 py-1.5">다른 담당자에게 재배치</p>
                              <div className="max-h-64 overflow-y-auto">
                                {profiles
                                  .filter(p => p.id !== c.profile.id)
                                  .map(p => {
                                    const load = tasks.filter((x: any) => x.assignee_id === p.id && x.status !== 'done').length;
                                    const isLeave = !!onLeaveIds?.has(p.id);
                                    return (
                                      <button
                                        key={p.id}
                                        onClick={() => reassign(t, p.id, p.name_kr)}
                                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left disabled:opacity-50"
                                        disabled={reassigningId === t.id}
                                      >
                                        <span className="flex items-center gap-1.5 min-w-0">
                                          <Avatar className="h-5 w-5 bg-primary"><AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{p.avatar}</AvatarFallback></Avatar>
                                          <span className="truncate">{p.name_kr}</span>
                                          {isLeave && <span className="text-[9px] text-orange-600">휴가</span>}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">활성 {load}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </PopoverContent>
                          </Popover>
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
