import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowUpDown, FolderKanban, Calendar, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
  project_name?: string | null;
  assignee_id?: string | null;
  priority?: string | null;
  is_design_request?: boolean;
}

interface Props {
  tasks: Task[];
  profiles: any[];
  selectedProject: string;
  selectedCategory: string;
  onTaskClick: (task: Task) => void;
}

type SortKey = 'title' | 'status' | 'due_date' | 'project_name' | 'priority';

const statusLabels: Record<string, string> = {
  todo: '할 일',
  'in-progress': '진행 중',
  review: '검토',
  done: '완료',
  scheduled: '예약',
};
const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  scheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};
const priorityColors: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-amber-600',
  low: 'text-muted-foreground',
};

export default function TaskListView({ tasks, profiles, selectedProject, selectedCategory, onTaskClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const getProfile = (id?: string | null) => profiles.find((p) => p.user_id === id);

  const getDaysLeft = (due?: string | null) => {
    if (!due) return null;
    try {
      return differenceInDays(startOfDay(parseISO(due)), startOfDay(new Date()));
    } catch {
      return null;
    }
  };

  const filteredSorted = useMemo(() => {
    const f = tasks.filter((t) => {
      if (selectedProject !== 'all') {
        if (selectedProject === 'unassigned' ? !!t.project_name : t.project_name !== selectedProject) return false;
      }
      if (selectedCategory !== 'all' && (t as any).category !== selectedCategory) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return f.sort((a: any, b: any) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [tasks, selectedProject, selectedCategory, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const SortHead = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <th className={`text-left py-2.5 px-3 text-xs font-medium text-muted-foreground ${className}`}>
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <SortHead k="title" label="제목" />
              <SortHead k="status" label="상태" className="w-28" />
              <SortHead k="project_name" label="프로젝트" className="w-40" />
              <SortHead k="priority" label="우선순위" className="w-24" />
              <SortHead k="due_date" label="마감일" className="w-36" />
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground w-24">담당자</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                  표시할 업무가 없습니다
                </td>
              </tr>
            ) : (
              filteredSorted.map((t) => {
                const days = getDaysLeft(t.due_date);
                const overdue = days !== null && days < 0 && t.status !== 'done';
                const assignee = getProfile(t.assignee_id);
                return (
                  <tr
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {t.is_design_request && <Badge variant="outline" className="text-[10px]">디자인</Badge>}
                        <span className="font-medium">{t.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[t.status] || ''}`}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {t.project_name ? (
                        <Badge variant="outline" className="text-[11px] gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {t.project_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">미지정</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-medium ${priorityColors[t.priority || ''] || 'text-muted-foreground'}`}>
                        {t.priority === 'high' ? '높음' : t.priority === 'medium' ? '보통' : t.priority === 'low' ? '낮음' : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {t.due_date ? (
                        <div className="flex items-center gap-1.5">
                          {overdue && <AlertTriangle className="h-3 w-3 text-destructive" />}
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-foreground'}`}>
                            {format(parseISO(t.due_date), 'M/d')}
                            {days !== null && (
                              <span className="text-muted-foreground ml-1">
                                ({days < 0 ? `${Math.abs(days)}일 지연` : days === 0 ? '오늘' : `D-${days}`})
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {assignee.avatar || assignee.name?.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">미배정</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
