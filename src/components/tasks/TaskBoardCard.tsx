import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, Palette, FolderKanban, FileText } from 'lucide-react';
import type { TaskCategory } from './CategoryBar';

interface TaskBoardCardProps {
  task: any;
  assignee?: any;
  category?: TaskCategory;
  toggles: { compact: boolean; hideDone?: boolean; myOnly?: boolean; overdueOnly?: boolean };
  selectedProject: string;
  onEdit: (task: any, e?: React.MouseEvent) => void;
  onDelete: (taskId: string, e: React.MouseEvent) => void;
  onQuickStatusChange: (taskId: string, currentStatus: string, direction: 'prev' | 'next', e: React.MouseEvent) => void;
  getDaysLeft: (dueDate: string | null) => number | null;
  isOngoingTask: (task: any) => boolean;
  ONGOING_TAG: string;
  statusOrder: string[];
  statusLabels: Record<string, string>;
  canEdit: boolean;
}

export default function TaskBoardCard({
  task,
  assignee,
  category,
  toggles,
  selectedProject,
  onEdit,
  onDelete,
  onQuickStatusChange,
  getDaysLeft,
  isOngoingTask,
  ONGOING_TAG,
  statusOrder,
  statusLabels,
  canEdit,
}: TaskBoardCardProps) {
  const isDesign = task.is_design_request;
  const daysLeft = getDaysLeft(task.due_date);
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done';
  const currentStatusIdx = statusOrder.indexOf(task.status);

  return (
    <Card
      className={`group relative transition-all cursor-grab active:cursor-grabbing overflow-hidden ${isDesign ? 'border-l-2 border-l-primary' : ''} ${isOverdue ? 'border-l-2 border-l-destructive' : ''}`}
    >
      {category && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: category.color }} />}
      <CardContent className={toggles.compact ? 'p-2 pl-3 space-y-1' : 'p-3 pl-3.5 space-y-2'}>
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {task.priority === 'urgent' && <span className="text-xs shrink-0">🔴</span>}
            {task.priority === 'high' && <span className="text-xs shrink-0">🟠</span>}
            {category?.icon && <span className="text-xs shrink-0" title={category.name}>{category.icon}</span>}
            {isDesign && <Palette className="h-3.5 w-3.5 text-primary shrink-0" />}
            <p className="text-sm font-medium leading-snug truncate">{task.title}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {canEdit && (
              <>
                <button onClick={(e) => onEdit(task, e)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="수정">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={(e) => onDelete(task.id, e)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="삭제">
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {!toggles.compact && task.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        {isDesign && Array.isArray(task.attachments) && task.attachments.filter((u: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(u)).length > 0 && (
          <div className="flex gap-1 overflow-hidden">
            {task.attachments
              .filter((u: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(u))
              .slice(0, 3)
              .map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="h-12 w-12 object-cover rounded border bg-muted shrink-0" loading="lazy" />
              ))}
            {task.attachments.filter((u: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(u)).length > 3 && (
              <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                +{task.attachments.filter((u: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(u)).length - 3}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {task.project_name && selectedProject === 'all' && (
            <Badge variant="outline" className="text-[10px] gap-0.5 bg-muted/50">
              <FolderKanban className="h-2.5 w-2.5" /> {task.project_name}
            </Badge>
          )}
          {isDesign && (
            <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary">
              <Palette className="h-2.5 w-2.5" /> 디자인
            </Badge>
          )}
          {task.meeting_id && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <FileText className="h-2.5 w-2.5" /> 회의록
            </Badge>
          )}
          {(task.tags || [])
            .filter((tag: string) => tag !== ONGOING_TAG)
            .slice(0, 2)
            .map((tag: string) => (
              <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
            ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          {assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-primary/80 text-primary-foreground text-[9px]">{assignee.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-muted-foreground">{assignee.name_kr}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            {currentStatusIdx > 0 && (
              <button
                onClick={(e) => onQuickStatusChange(task.id, task.status, 'prev', e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={statusLabels[statusOrder[currentStatusIdx - 1]]}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            {currentStatusIdx < statusOrder.length - 1 && (
              <button
                onClick={(e) => onQuickStatusChange(task.id, task.status, 'next', e)}
                className={`p-0.5 rounded transition-colors ${
                  currentStatusIdx === statusOrder.length - 2
                    ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 hover:text-emerald-700'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                title={statusLabels[statusOrder[currentStatusIdx + 1]]}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {isOngoingTask(task) && task.status !== 'done' ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                <Calendar className="h-2.5 w-2.5 mr-0.5" /> 상시
              </Badge>
            ) : isOngoingTask(task) && task.status === 'done' ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/20">
                <Calendar className="h-2.5 w-2.5 mr-0.5" /> 종결
              </Badge>
            ) : daysLeft !== null && task.status === 'done' ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/20">
                <Calendar className="h-2.5 w-2.5 mr-0.5" /> 완료
              </Badge>
            ) : daysLeft !== null ? (
              <Badge
                variant={daysLeft < 0 ? 'destructive' : 'outline'}
                className={`text-[10px] px-1.5 py-0 ${
                  daysLeft === 0
                    ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-500'
                    : daysLeft > 0 && daysLeft <= 3
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : ''
                }`}
              >
                <Calendar className="h-2.5 w-2.5 mr-0.5" />
                {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : daysLeft === 0 ? 'D-DAY' : `D-${daysLeft}`}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
