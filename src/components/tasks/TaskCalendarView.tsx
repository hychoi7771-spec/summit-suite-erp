import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ko } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
  project_name?: string | null;
  is_design_request?: boolean;
  priority?: string | null;
}

interface Props {
  tasks: Task[];
  selectedProject: string;
  selectedCategory: string;
  onTaskClick: (task: Task) => void;
}

const statusDot: Record<string, string> = {
  todo: 'bg-slate-400',
  'in-progress': 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
  scheduled: 'bg-violet-500',
};

export default function TaskCalendarView({ tasks, selectedProject, selectedCategory, onTaskClick }: Props) {
  const [cursor, setCursor] = useState(new Date());

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.due_date) return false;
        if (selectedProject !== 'all') {
          if (selectedProject === 'unassigned' ? !!t.project_name : t.project_name !== selectedProject) return false;
        }
        if (selectedCategory !== 'all' && (t as any).category !== selectedCategory) return false;
        return true;
      }),
    [tasks, selectedProject, selectedCategory]
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const arr: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) arr.push(d);
    return arr;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filtered.forEach((t) => {
      if (!t.due_date) return;
      const key = format(parseISO(t.due_date), 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [filtered]);

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{format(cursor, 'yyyy년 M월', { locale: ko })}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            오늘
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {weekdays.map((w, i) => (
          <div
            key={w}
            className={`bg-muted/50 text-xs font-medium text-center py-2 ${
              i === 0 ? 'text-destructive' : i === 6 ? 'text-blue-600' : 'text-muted-foreground'
            }`}
          >
            {w}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const items = tasksByDate.get(key) || [];
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`bg-card min-h-[110px] p-1.5 flex flex-col gap-1 ${
                !inMonth ? 'opacity-40' : ''
              }`}
            >
              <div
                className={`text-xs font-medium self-start px-1.5 py-0.5 rounded-md ${
                  today ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {items.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className="flex items-center gap-1 text-left text-[11px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors truncate"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[t.status] || 'bg-muted-foreground'}`} />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {items.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1.5">+{items.length - 3}개 더보기</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
        {Object.entries({ todo: '할 일', 'in-progress': '진행 중', review: '검토', done: '완료', scheduled: '예약' }).map(
          ([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${statusDot[k]}`} />
              <span>{v}</span>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
