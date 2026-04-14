import { useMemo } from 'react';
import { differenceInDays, addDays, format, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PHASE_COLORS, PHASES } from './launchDefaultSteps';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface LaunchGanttChartProps {
  steps: any[];
  dependencies: any[];
  profiles: any[];
  onStepClick: (step: any) => void;
}

export function LaunchGanttChart({ steps, dependencies, profiles, onStepClick }: LaunchGanttChartProps) {
  const { timelineStart, timelineEnd, totalDays, months } = useMemo(() => {
    const dates = steps
      .flatMap(s => [s.start_date, s.end_date, s.deadline].filter(Boolean))
      .map(d => new Date(d));

    if (dates.length === 0) {
      const now = new Date();
      return {
        timelineStart: now,
        timelineEnd: addDays(now, 180),
        totalDays: 180,
        months: eachMonthOfInterval({ start: now, end: addDays(now, 180) }),
      };
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const start = addDays(startOfMonth(min), -7);
    const end = addDays(endOfMonth(max), 14);
    const total = differenceInDays(end, start);

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: Math.max(total, 90),
      months: eachMonthOfInterval({ start, end }),
    };
  }, [steps]);

  const getBarPosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return null;
    const start = differenceInDays(new Date(startDate), timelineStart);
    const end = endDate
      ? differenceInDays(new Date(endDate), timelineStart)
      : start + 14;
    const left = (start / totalDays) * 100;
    const width = Math.max(((end - start) / totalDays) * 100, 1.5);
    return { left: `${left}%`, width: `${width}%` };
  };

  const groupedSteps = useMemo(() => {
    const groups: Record<string, any[]> = {};
    PHASES.forEach(p => { groups[p] = []; });
    steps.forEach(s => {
      if (groups[s.phase]) groups[s.phase].push(s);
    });
    return groups;
  }, [steps]);

  const today = new Date();
  const todayPos = (differenceInDays(today, timelineStart) / totalDays) * 100;

  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      {/* Header - months */}
      <div className="flex border-b sticky top-0 bg-card z-10">
        <div className="w-56 shrink-0 border-r p-2 text-xs font-medium text-muted-foreground">단계</div>
        <div className="flex-1 relative min-w-[600px]">
          <div className="flex">
            {months.map((m, i) => {
              const mStart = differenceInDays(m, timelineStart);
              const mEnd = i < months.length - 1
                ? differenceInDays(months[i + 1], timelineStart)
                : totalDays;
              const width = ((mEnd - mStart) / totalDays) * 100;
              return (
                <div key={i} className="text-xs text-muted-foreground p-1 border-r" style={{ width: `${width}%` }}>
                  {format(m, 'yyyy.MM', { locale: ko })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rows grouped by phase */}
      {PHASES.map(phase => {
        const phaseSteps = groupedSteps[phase] || [];
        if (phaseSteps.length === 0) return null;
        return (
          <div key={phase}>
            {/* Phase header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-56 shrink-0 border-r p-2">
                <span className="text-xs font-semibold" style={{ color: PHASE_COLORS[phase] }}>{phase}</span>
              </div>
              <div className="flex-1 min-w-[600px]" />
            </div>
            {/* Steps */}
            {phaseSteps.map(step => {
              const bar = getBarPosition(step.start_date, step.end_date);
              const assignee = getProfile(step.assignee_id);
              const isOverdue = step.deadline && differenceInDays(new Date(step.deadline), today) < 0 && step.status !== 'done';
              const statusColor = step.status === 'done' ? 'bg-success' : step.status === 'in-progress' ? 'bg-info' : 'bg-muted-foreground/30';

              return (
                <div
                  key={step.id}
                  className="flex border-b hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => onStepClick(step)}
                >
                  <div className="w-56 shrink-0 border-r p-2 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                    <span className={`text-xs truncate ${step.is_critical ? 'font-bold' : ''} ${isOverdue ? 'text-destructive' : ''}`}>
                      {step.step_name}
                    </span>
                    {step.is_critical && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                    {isOverdue && <span className="text-[10px] text-destructive font-medium shrink-0">지연</span>}
                  </div>
                  <div className="flex-1 relative min-w-[600px] h-10">
                    {/* Today line */}
                    {todayPos > 0 && todayPos < 100 && (
                      <div className="absolute top-0 bottom-0 w-px bg-destructive/40 z-10" style={{ left: `${todayPos}%` }} />
                    )}
                    {bar && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-2 h-6 rounded-md transition-all ${
                              step.is_critical
                                ? 'bg-destructive/80 border border-destructive'
                                : step.status === 'done'
                                ? 'bg-success/70'
                                : step.status === 'in-progress'
                                ? 'bg-info/70'
                                : 'bg-muted-foreground/20'
                            } ${isOverdue ? 'ring-2 ring-destructive/50' : ''}`}
                            style={{ left: bar.left, width: bar.width }}
                          >
                            {assignee && (
                              <span className="absolute -top-0.5 -right-1 h-4 w-4 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center font-medium">
                                {assignee.avatar?.substring(0, 1)}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <p className="font-semibold">{step.step_name}</p>
                            <p>상태: {step.status === 'waiting' ? '대기' : step.status === 'in-progress' ? '진행중' : '완료'}</p>
                            {step.start_date && <p>시작: {step.start_date}</p>}
                            {step.end_date && <p>종료: {step.end_date}</p>}
                            {step.deadline && <p>마감: {step.deadline}</p>}
                            {assignee && <p>담당: {assignee.name_kr}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!bar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">일정 미설정</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="h-3 w-6 rounded bg-muted-foreground/20" /> 대기</div>
        <div className="flex items-center gap-1"><div className="h-3 w-6 rounded bg-info/70" /> 진행중</div>
        <div className="flex items-center gap-1"><div className="h-3 w-6 rounded bg-success/70" /> 완료</div>
        <div className="flex items-center gap-1"><div className="h-3 w-6 rounded bg-destructive/80 border border-destructive" /> Critical Path</div>
        <div className="flex items-center gap-1"><div className="w-px h-3 bg-destructive/40" /> 오늘</div>
      </div>
    </div>
  );
}
