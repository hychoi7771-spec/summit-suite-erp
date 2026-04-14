import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Paperclip, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface LaunchStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: any;
  profiles: any[];
  onSaved: () => void;
}

export function LaunchStepDialog({ open, onOpenChange, step, profiles, onSaved }: LaunchStepDialogProps) {
  const [status, setStatus] = useState(step?.status || 'waiting');
  const [assigneeId, setAssigneeId] = useState(step?.assignee_id || 'unassigned');
  const [startDate, setStartDate] = useState(step?.start_date || '');
  const [endDate, setEndDate] = useState(step?.end_date || '');
  const [deadline, setDeadline] = useState(step?.deadline || '');
  const [notes, setNotes] = useState(step?.notes || '');
  const [isCritical, setIsCritical] = useState(step?.is_critical || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (step) {
      setStatus(step.status || 'waiting');
      setAssigneeId(step.assignee_id || 'unassigned');
      setStartDate(step.start_date || '');
      setEndDate(step.end_date || '');
      setDeadline(step.deadline || '');
      setNotes(step.notes || '');
      setIsCritical(step.is_critical || false);
    }
  }, [step]);

  const daysLeft = deadline ? differenceInDays(new Date(deadline), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && status !== 'done';

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('launch_steps').update({
      status,
      assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
      start_date: startDate || null,
      end_date: endDate || null,
      deadline: deadline || null,
      notes: notes || null,
      is_critical: isCritical,
    }).eq('id', step.id);

    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '저장 완료' });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  if (!step) return null;

  const assignee = profiles.find(p => p.id === assigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step.step_name}
            {step.is_critical && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />Critical
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{step.phase}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="space-y-1.5">
            <Label>상태</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">대기</SelectItem>
                <SelectItem value="in-progress">진행중</SelectItem>
                <SelectItem value="done">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label>담당자</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">미지정</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{p.avatar}</AvatarFallback></Avatar>
                      {p.name_kr}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>시작일</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>종료일</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                마감일
                {isOverdue && <span className="text-destructive text-xs">(D+{Math.abs(daysLeft!)})</span>}
              </Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          {daysLeft !== null && !isOverdue && status !== 'done' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              마감까지 D-{daysLeft}
            </p>
          )}
          {isOverdue && (
            <p className="text-xs text-destructive flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3 w-3" />
              마감일 {Math.abs(daysLeft!)}일 초과!
            </p>
          )}

          {/* Critical */}
          <div className="flex items-center gap-2">
            <Switch checked={isCritical} onCheckedChange={setIsCritical} />
            <Label>Critical Path (필수 단계)</Label>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>메모</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="비고 사항을 입력하세요..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '저장중...' : '저장'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
