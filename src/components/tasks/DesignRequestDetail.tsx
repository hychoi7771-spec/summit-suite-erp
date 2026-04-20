import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Palette, Paperclip, FileText } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

interface DesignRequestDetailProps {
  task: any;
  assignee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DesignRequestDetail({ task, assignee, open, onOpenChange }: DesignRequestDetailProps) {
  const daysLeft = task.due_date ? differenceInDays(startOfDay(parseISO(task.due_date)), startOfDay(new Date())) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            디자인 의뢰서
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* 담당자 & 기한 */}
          <div className="flex items-center justify-between">
            {assignee && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 bg-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{assignee.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{assignee.name_kr}</p>
                  <p className="text-xs text-muted-foreground">담당자</p>
                </div>
              </div>
            )}
            {daysLeft !== null && (
              <Badge variant={daysLeft <= 3 ? 'destructive' : daysLeft <= 7 ? 'secondary' : 'outline'}>
                <Calendar className="h-3 w-3 mr-1" />
                {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
              </Badge>
            )}
          </div>

          {/* 프로젝트명 */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">프로젝트명</p>
            <p className="text-sm font-medium">{task.project_name || '-'}</p>
          </div>

          {/* 상세 설명 */}
          {task.description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">상세 설명</p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* 핵심 강조 스토리 */}
          {task.key_story && (
            <div className="space-y-1 bg-primary/5 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary uppercase flex items-center gap-1">
                <FileText className="h-3 w-3" /> 핵심 강조 스토리
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.key_story}</p>
            </div>
          )}

          {/* 첨부 자료 */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> 첨부 자료 ({task.attachments.length})
              </p>
              <div className="space-y-1">
                {task.attachments.map((url: string, i: number) => {
                  const fileName = decodeURIComponent(url.split('/').pop() || '').replace(/^\d+-/, '');
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted rounded px-3 py-2"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{fileName}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* 마감일 */}
          {task.due_date && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">마감일</p>
              <p className="text-sm">{task.due_date}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
