import { useMemo, useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, FolderOpen, AlertTriangle, Calendar } from 'lucide-react';
import {
  addDays, subDays, startOfDay, differenceInDays, format, isToday,
  startOfWeek, eachDayOfInterval, parseISO,
  addWeeks, subWeeks, isWeekend,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string;
}

interface GanttChartProps {
  tasks: any[];
  profiles: any[];
  categories?: TaskCategory[];
  selectedProject: string;
  selectedCategory?: string;
  onTaskClick?: (task: any) => void;
}

const statusColors: Record<string, string> = {
  'todo': 'bg-slate-400',
  'in-progress': 'bg-blue-500',
  'review': 'bg-amber-500',
  'done': 'bg-emerald-500',
};

const statusBarGradients: Record<string, string> = {
  'todo': 'bg-gradient-to-r from-slate-400 to-slate-500',
  'in-progress': 'bg-gradient-to-r from-blue-400 to-blue-600',
  'review': 'bg-gradient-to-r from-amber-400 to-amber-600',
  'done': 'bg-gradient-to-r from-emerald-400 to-emerald-600',
};

const statusLabels: Record<string, string> = {
  'todo': '대기',
  'in-progress': '진행',
  'review': '검토',
  'done': '완료',
};

const priorityIndicator: Record<string, string> = {
  'urgent': '🔴',
  'high': '🟠',
  'medium': '',
  'low': '',
};

const groupColors = [
  { bg: 'bg-blue-500/8', border: 'border-l-blue-500', headerBg: 'bg-blue-500/12', dot: 'bg-blue-500' },
  { bg: 'bg-violet-500/8', border: 'border-l-violet-500', headerBg: 'bg-violet-500/12', dot: 'bg-violet-500' },
  { bg: 'bg-emerald-500/8', border: 'border-l-emerald-500', headerBg: 'bg-emerald-500/12', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-500/8', border: 'border-l-amber-500', headerBg: 'bg-amber-500/12', dot: 'bg-amber-500' },
  { bg: 'bg-rose-500/8', border: 'border-l-rose-500', headerBg: 'bg-rose-500/12', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-500/8', border: 'border-l-cyan-500', headerBg: 'bg-cyan-500/12', dot: 'bg-cyan-500' },
  { bg: 'bg-orange-500/8', border: 'border-l-orange-500', headerBg: 'bg-orange-500/12', dot: 'bg-orange-500' },
  { bg: 'bg-pink-500/8', border: 'border-l-pink-500', headerBg: 'bg-pink-500/12', dot: 'bg-pink-500' },
];

const CELL_WIDTH = 36;
const HEADER_HEIGHT = 64;
const ROW_HEIGHT = 38;
const GROUP_HEADER_HEIGHT = 36;
const LEFT_PANEL_WIDTH = 540;

export default function GanttChart({ tasks, profiles, categories = [], selectedProject, selectedCategory = 'all', onTaskClick }: GanttChartProps) {
  const [viewStart, setViewStart] = useState(() => startOfWeek(subDays(new Date(), 3), { weekStartsOn: 1 }));
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  const viewDays = 42;
  const viewEnd = addDays(viewStart, viewDays - 1);

  const days = useMemo(() =>
    eachDayOfInterval({ start: viewStart, end: viewEnd }),
    [viewStart, viewEnd]
  );

  const categoryById = useMemo(() => {
    const m = new Map<string, TaskCategory>();
    categories.forEach(c => m.set(c.id, c));
    return m;
  }, [categories]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedProject === '__none__') result = result.filter(t => !t.project_name);
    else if (selectedProject !== 'all') result = result.filter(t => t.project_name === selectedProject);
    if (selectedCategory === '__none__') result = result.filter(t => !t.category_id);
    else if (selectedCategory !== 'all') result = result.filter(t => t.category_id === selectedCategory);
    return result;
  }, [tasks, selectedProject, selectedCategory]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const counts: Record<string, number> = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
    filteredTasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    const overdue = filteredTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      return differenceInDays(startOfDay(parseISO(t.due_date)), startOfDay(new Date())) < 0;
    }).length;
    const donePercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    return { total, counts, overdue, donePercent };
  }, [filteredTasks]);

  const groupedByProject = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredTasks.forEach(t => {
      const key = t.project_name || '미분류';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const statusOrder = ['in-progress', 'todo', 'review', 'done'];
    Object.values(groups).forEach(arr => {
      arr.sort((a: any, b: any) => {
        const sa = statusOrder.indexOf(a.status);
        const sb = statusOrder.indexOf(b.status);
        if (sa !== sb) return sa - sb;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
    });
    return groups;
  }, [filteredTasks]);

  const projectNames = useMemo(() => Object.keys(groupedByProject), [groupedByProject]);

  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const rows = useMemo(() => {
    const result: { type: 'header' | 'task'; label?: string; count?: number; task?: any; colorIdx?: number; stats?: Record<string, number> }[] = [];
    projectNames.forEach((name, idx) => {
      const groupTasks = groupedByProject[name];
      const gStats: Record<string, number> = {};
      groupTasks.forEach((t: any) => { gStats[t.status] = (gStats[t.status] || 0) + 1; });
      result.push({ type: 'header', label: name, count: groupTasks.length, colorIdx: idx % groupColors.length, stats: gStats });
      if (!collapsedGroups.has(name)) {
        groupTasks.forEach((task: any) => result.push({ type: 'task', task, colorIdx: idx % groupColors.length }));
      }
    });
    return result;
  }, [groupedByProject, projectNames, collapsedGroups]);

  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  const getBarPosition = (task: any) => {
    const start = task.start_date ? parseISO(task.start_date) : (task.created_at ? startOfDay(new Date(task.created_at)) : null);
    const end = task.due_date ? parseISO(task.due_date) : null;
    if (!start && !end) return null;

    const barStart = start || end!;
    const barEnd = end || addDays(barStart, 2);
    const startOffset = differenceInDays(barStart, viewStart);
    const duration = Math.max(differenceInDays(barEnd, barStart) + 1, 1);

    return { left: startOffset * CELL_WIDTH, width: duration * CELL_WIDTH - 4 };
  };

  const monthHeaders = useMemo(() => {
    const months: { label: string; span: number; key: string }[] = [];
    let currentMonth = '';
    days.forEach(day => {
      const m = format(day, 'yyyy-MM');
      if (m !== currentMonth) {
        currentMonth = m;
        months.push({ label: format(day, 'yyyy년 M월', { locale: ko }), span: 1, key: m });
      } else {
        months[months.length - 1].span++;
      }
    });
    return months;
  }, [days]);

  const goToToday = () => {
    setViewStart(startOfWeek(subDays(new Date(), 3), { weekStartsOn: 1 }));
  };

  const todayOffset = differenceInDays(startOfDay(new Date()), viewStart);
  const showTodayLine = todayOffset >= 0 && todayOffset < viewDays;

  // Sync scroll between left and right panels
  const handleRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
    }
  }, []);

  const handleLeftScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      const rightScrollable = scrollRef.current.querySelector('[data-gantt-rows]') as HTMLDivElement;
      if (rightScrollable) {
        rightScrollable.scrollTop = (e.target as HTMLDivElement).scrollTop;
      }
    }
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        {/* Summary Bar */}
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">진행률</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${stats.donePercent}%` }} />
                </div>
                <span className="text-xs font-bold text-primary">{stats.donePercent}%</span>
              </div>
            </div>
            {/* Status counts */}
            <div className="flex items-center gap-3">
              {[
                { key: 'todo', label: '대기', color: 'bg-slate-400' },
                { key: 'in-progress', label: '진행', color: 'bg-blue-500' },
                { key: 'review', label: '검토', color: 'bg-amber-500' },
                { key: 'done', label: '완료', color: 'bg-emerald-500' },
              ].map(s => (
                <div key={s.key} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-bold">{stats.counts[s.key]}</span>
                </div>
              ))}
            </div>
            {/* Overdue alert */}
            {stats.overdue > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">기한초과 {stats.overdue}</span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">총 {stats.total}건</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewStart(s => subWeeks(s, 4))}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewStart(s => subWeeks(s, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-3 font-semibold" onClick={goToToday}>
              오늘
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewStart(s => addWeeks(s, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewStart(s => addWeeks(s, 4))}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {format(viewStart, 'M/d', { locale: ko })} – {format(viewEnd, 'M/d', { locale: ko })}
          </div>
        </div>

        <div className="flex overflow-hidden">
          {/* Left Panel */}
          <div className="shrink-0 border-r" style={{ width: LEFT_PANEL_WIDTH }}>
            <div className="flex items-end border-b bg-muted/20" style={{ height: HEADER_HEIGHT }}>
              <div className="flex-1 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">업무</div>
              <div className="w-10 px-1 py-2 text-[10px] font-semibold text-muted-foreground text-center">담당</div>
              <div className="w-14 px-1 py-2 text-[10px] font-semibold text-muted-foreground text-center">상태</div>
              <div className="w-[72px] px-1 py-2 text-[10px] font-semibold text-muted-foreground text-center">시작</div>
              <div className="w-[72px] px-1 py-2 text-[10px] font-semibold text-muted-foreground text-center">마감</div>
            </div>

            <div className="overflow-y-auto" ref={leftScrollRef} onScroll={handleLeftScroll} style={{ maxHeight: 'calc(70vh - 160px)' }}>
              {rows.map((row, i) => {
                if (row.type === 'header') {
                  const color = groupColors[row.colorIdx || 0];
                  const collapsed = collapsedGroups.has(row.label || '');
                  const groupDoneCount = row.stats?.['done'] || 0;
                  const groupTotal = row.count || 0;
                  const groupPercent = groupTotal > 0 ? Math.round((groupDoneCount / groupTotal) * 100) : 0;
                  return (
                    <div
                      key={`h-${i}`}
                      className={`flex items-center gap-2 px-3 border-b border-l-[3px] cursor-pointer select-none transition-colors hover:brightness-95 ${color.headerBg} ${color.border}`}
                      style={{ height: GROUP_HEADER_HEIGHT }}
                      onClick={() => toggleGroup(row.label || '')}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{row.label}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">({row.count})</span>
                      {/* Group progress mini bar */}
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color.dot}`} style={{ width: `${groupPercent}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-medium">{groupPercent}%</span>
                        {row.stats && Object.entries(row.stats).map(([status, count]) => (
                          <span key={status} className="flex items-center gap-0.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusColors[status]}`} />
                            <span className="text-[9px] text-muted-foreground">{count as number}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                const task = row.task!;
                const assignee = getProfile(task.assignee_id);
                const color = groupColors[row.colorIdx || 0];
                const isOverdue = task.due_date && task.status !== 'done' && differenceInDays(parseISO(task.due_date), new Date()) < 0;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center border-b border-border/30 border-l-[3px] hover:bg-muted/30 transition-colors cursor-pointer ${color.border} ${color.bg}`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="flex-1 flex items-center gap-1.5 px-3 min-w-0 pl-8">
                      {priorityIndicator[task.priority] && <span className="text-[10px] shrink-0">{priorityIndicator[task.priority]}</span>}
                      {isOverdue && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                      <span className={`text-xs truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                    </div>
                    <div className="w-10 flex justify-center">
                      {assignee ? (
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary/80 text-primary-foreground">{assignee.avatar}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">–</span>
                      )}
                    </div>
                    <div className="w-14 px-0.5 flex justify-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-white ${statusColors[task.status] || 'bg-muted-foreground/60'}`}>
                        {statusLabels[task.status] || task.status}
                      </span>
                    </div>
                    <div className="w-[72px] px-1 text-[10px] text-muted-foreground text-center">
                      {task.start_date ? format(parseISO(task.start_date), 'M/d') : '–'}
                    </div>
                    <div className={`w-[72px] px-1 text-[10px] text-center ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {task.due_date ? format(parseISO(task.due_date), 'M/d') : '–'}
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  업무가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Timeline */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={scrollRef}>
            <div style={{ width: days.length * CELL_WIDTH, minWidth: '100%' }}>
              {/* Month + Day header */}
              <div style={{ height: HEADER_HEIGHT }} className="border-b bg-muted/20">
                <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                  {monthHeaders.map(m => (
                    <div
                      key={m.key}
                      className="flex items-center justify-center text-[11px] font-semibold text-muted-foreground border-r border-border/30"
                      style={{ width: m.span * CELL_WIDTH }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                  {days.map(day => (
                    <div
                      key={day.toISOString()}
                      className={`flex flex-col items-center justify-center border-r border-border/20 ${
                        isToday(day) ? 'bg-primary/15 font-bold' : isWeekend(day) ? 'bg-muted/50' : ''
                      }`}
                      style={{ width: CELL_WIDTH }}
                    >
                      <span className={`text-[9px] ${isWeekend(day) ? 'text-muted-foreground/60' : ''} ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                        {format(day, 'EEE', { locale: ko })}
                      </span>
                      <span className={`text-[10px] ${isToday(day) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline rows */}
              <div className="overflow-y-auto relative" data-gantt-rows style={{ maxHeight: 'calc(70vh - 160px)' }} onScroll={handleRightScroll}>
                {/* Today indicator line */}
                {showTodayLine && (
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: todayOffset * CELL_WIDTH + CELL_WIDTH / 2 - 1 }}
                  >
                    <div className="w-0.5 h-full bg-primary/60" />
                    <div className="absolute top-0 -translate-x-[calc(50%-1px)] bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-b">
                      오늘
                    </div>
                  </div>
                )}

                {rows.map((row, i) => {
                  if (row.type === 'header') {
                    const color = groupColors[row.colorIdx || 0];
                    return (
                      <div key={`th-${i}`} className={`border-b relative ${color.headerBg}`} style={{ height: GROUP_HEADER_HEIGHT }}>
                        <div className="flex h-full">
                          {days.map(day => (
                            <div
                              key={day.toISOString()}
                              className={`border-r border-border/10 ${isWeekend(day) ? 'bg-black/[0.03]' : ''}`}
                              style={{ width: CELL_WIDTH }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  const task = row.task!;
                  const bar = getBarPosition(task);
                  const color = groupColors[row.colorIdx || 0];
                  const isOverdue = task.due_date && task.status !== 'done' && differenceInDays(parseISO(task.due_date), new Date()) < 0;
                  return (
                    <div
                      key={`tb-${task.id}`}
                      className={`relative border-b border-border/30 hover:brightness-95 transition-colors cursor-pointer ${color.bg}`}
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map(day => (
                          <div
                            key={day.toISOString()}
                            className={`border-r border-border/10 ${
                              isToday(day) ? 'bg-primary/5' : isWeekend(day) ? 'bg-black/[0.02]' : ''
                            }`}
                            style={{ width: CELL_WIDTH }}
                          />
                        ))}
                      </div>

                      {/* Bar */}
                      {bar && bar.left + bar.width > 0 && bar.left < days.length * CELL_WIDTH && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute top-[9px] rounded-full h-5 shadow-sm transition-all ${
                                isOverdue ? 'bg-gradient-to-r from-red-400 to-red-600 ring-1 ring-red-400/50' : (statusBarGradients[task.status] || 'bg-muted-foreground/60')
                              }`}
                              style={{
                                left: Math.max(bar.left + 2, 0),
                                width: Math.min(bar.width, days.length * CELL_WIDTH - Math.max(bar.left, 0)),
                                opacity: task.status === 'done' ? 0.45 : 0.9,
                              }}
                            >
                              <span className="text-[9px] text-white font-medium px-2 truncate block leading-5 drop-shadow-sm">
                                {bar.width > 80 ? task.title : ''}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[200px]">
                            <p className="font-semibold">{task.title}</p>
                            <p className="text-muted-foreground">
                              {task.start_date || '시작일 없음'} → {task.due_date || '마감일 없음'}
                            </p>
                            {isOverdue && <p className="text-destructive font-semibold">⚠ 기한 초과</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
