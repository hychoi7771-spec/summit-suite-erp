import { useState, useEffect } from 'react';
import { Check, RotateCw, X, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  RoutineTemplate, RoutineCompletion, TIME_OF_DAY_LABELS, STATUS_CONFIG,
  fetchRoutinesForDate, upsertRoutineCompletion, summarizeRoutineCompletions,
  RoutineCompletionStatus,
} from '@/lib/routines';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: string;
  date: string;
  isOwner: boolean;
  /** 체크아웃 모드일 때 (이월/스킵 가능) */
  allowFullActions?: boolean;
  /** 변경시 부모에게 통계 전달 */
  onChange?: (summary: ReturnType<typeof summarizeRoutineCompletions>) => void;
}

export function RoutineChecklist({ userId, date, isOwner, allowFullActions = true, onChange }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<{ template: RoutineTemplate; completion?: RoutineCompletion }[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipReasons, setSkipReasons] = useState<Record<string, string>>({});

  const load = async () => {
    if (!userId || !date) return;
    setLoading(true);
    const data = await fetchRoutinesForDate(userId, date);
    setItems(data);
    setLoading(false);
    onChange?.(summarizeRoutineCompletions(data));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId, date]);

  const handleStatus = async (templateId: string, status: RoutineCompletionStatus) => {
    if (!isOwner) {
      toast({ title: '본인 루틴만 체크할 수 있습니다', variant: 'destructive' });
      return;
    }
    const reason = status === 'skipped' ? (skipReasons[templateId] || '').trim() : undefined;
    if (status === 'skipped' && !reason) {
      toast({ title: '스킵 사유를 입력하세요', variant: 'destructive' });
      return;
    }
    const { error } = await upsertRoutineCompletion(templateId, userId, date, status, reason);
    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-2">루틴 로딩 중...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">
        오늘 적용되는 루틴이 없습니다. <span className="text-primary">루틴 관리</span>에서 등록하세요.
      </div>
    );
  }

  const summary = summarizeRoutineCompletions(items);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🔁 오늘의 루틴</span>
          <Badge variant="secondary" className="text-[10px]">
            {summary.done}/{summary.total} 완료
          </Badge>
        </div>
        <div className="w-24">
          <Progress value={summary.total > 0 ? (summary.done / summary.total) * 100 : 0} className="h-1.5" />
        </div>
      </div>

      <div className="space-y-2">
        {items.map(({ template, completion }) => {
          const status = (completion?.status || 'pending') as RoutineCompletionStatus;
          const cfg = STATUS_CONFIG[status];
          return (
            <Card key={template.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium">{template.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                      {cfg.emoji} {cfg.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{TIME_OF_DAY_LABELS[template.time_of_day]}</span>
                    {template.estimated_minutes > 0 && (
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />{template.estimated_minutes}분
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{template.description}</p>
                  )}
                  {status === 'skipped' && completion?.skip_reason && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      스킵 사유: {completion.skip_reason}
                    </p>
                  )}
                </div>
                {isOwner && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={status === 'done' ? 'default' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => handleStatus(template.id, 'done')}
                      >
                        <Check className="h-3 w-3 mr-0.5" /> 완료
                      </Button>
                      {allowFullActions && (
                        <>
                          <Button
                            size="sm"
                            variant={status === 'carry_over' ? 'default' : 'outline'}
                            className="h-7 px-2 text-xs"
                            onClick={() => handleStatus(template.id, 'carry_over')}
                          >
                            <RotateCw className="h-3 w-3 mr-0.5" /> 이월
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'skipped' ? 'default' : 'outline'}
                            className="h-7 px-2 text-xs"
                            onClick={() => handleStatus(template.id, 'skipped')}
                          >
                            <X className="h-3 w-3 mr-0.5" /> 스킵
                          </Button>
                        </>
                      )}
                    </div>
                    {allowFullActions && status !== 'skipped' && (
                      <Input
                        placeholder="스킵 시 사유"
                        value={skipReasons[template.id] || ''}
                        onChange={e => setSkipReasons({ ...skipReasons, [template.id]: e.target.value })}
                        className="h-6 text-[10px] w-32"
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {summary.total > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground bg-muted/30 rounded p-2">
          <span>✓ 완료 {summary.done}</span>
          <span>↻ 이월 {summary.carry}</span>
          <span>✗ 스킵 {summary.skipped}</span>
          <span>⏳ 대기 {summary.pending}</span>
        </div>
      )}
    </div>
  );
}
