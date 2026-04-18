import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { differenceInCalendarDays } from 'date-fns';
import { notifyAdmins } from '@/lib/notifications';

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const LEAVE_TYPES = [
  { value: 'annual', label: '연차' },
  { value: 'half_day', label: '반차' },
  { value: 'summer', label: '여름휴가' },
  { value: 'family_event', label: '경조사' },
  { value: 'sick', label: '병가 (연차 차감)' },
  { value: 'other', label: '기타' },
];

export function LeaveRequestDialog({ open, onOpenChange, onCreated }: LeaveRequestDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leave_type: 'annual',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm({ leave_type: 'annual', start_date: today, end_date: today, reason: '' });
    }
  }, [open]);

  const computeDays = () => {
    if (form.leave_type === 'half_day') return 0.5;
    if (!form.start_date || !form.end_date) return 1;
    const diff = differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1;
    return diff > 0 ? diff : 1;
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.start_date || !form.end_date) {
      toast({ title: '기간을 입력해주세요', variant: 'destructive' });
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast({ title: '종료일이 시작일보다 빠를 수 없습니다', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const days = computeDays();
    const typeLabel = LEAVE_TYPES.find(t => t.value === form.leave_type)?.label || '휴가';

    // 0) 결재선 구성: 이사(general_director) → 대표(ceo)
    const { data: approverRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['general_director', 'ceo']);

    const approverUserIds = (approverRoles ?? []).map(r => r.user_id);
    const { data: approverProfiles } = approverUserIds.length
      ? await supabase.from('profiles').select('id, user_id').in('user_id', approverUserIds)
      : { data: [] as { id: string; user_id: string }[] };

    const userIdToProfileId = new Map((approverProfiles ?? []).map(p => [p.user_id, p.id]));
    const orderedApproverProfileIds: string[] = [];
    // 1순위: 이사
    (approverRoles ?? [])
      .filter(r => r.role === 'general_director')
      .forEach(r => {
        const pid = userIdToProfileId.get(r.user_id);
        if (pid && !orderedApproverProfileIds.includes(pid)) orderedApproverProfileIds.push(pid);
      });
    // 2순위: 대표
    (approverRoles ?? [])
      .filter(r => r.role === 'ceo')
      .forEach(r => {
        const pid = userIdToProfileId.get(r.user_id);
        if (pid && !orderedApproverProfileIds.includes(pid)) orderedApproverProfileIds.push(pid);
      });

    if (orderedApproverProfileIds.length === 0) {
      toast({ title: '결재자 없음', description: '이사/대표 계정이 등록되어 있지 않습니다.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 1) 전자결재 등록 (leave 타입) + current_approver_id 지정
    const { data: approval, error: appErr } = await supabase
      .from('approvals')
      .insert({
        requester_id: profile.id,
        type: 'leave',
        title: `[${typeLabel}] ${form.start_date}${form.start_date !== form.end_date ? ` ~ ${form.end_date}` : ''} (${days}일)`,
        content: form.reason || '',
        status: 'pending',
        current_approver_id: orderedApproverProfileIds[0],
      })
      .select()
      .single();

    if (appErr || !approval) {
      toast({ title: '결재 신청 실패', description: appErr?.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 1-1) 결재 단계(approval_steps) 생성
    const steps = orderedApproverProfileIds.map((approverId, idx) => ({
      approval_id: approval.id,
      approver_id: approverId,
      step_order: idx + 1,
      status: 'pending' as const,
    }));
    const { error: stepsErr } = await supabase.from('approval_steps').insert(steps);
    if (stepsErr) {
      toast({ title: '결재선 생성 실패', description: stepsErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 2) 휴가 신청 등록 (approval과 연결)
    const { error: leaveErr } = await supabase.from('leave_requests').insert({
      user_id: profile.id,
      leave_type: form.leave_type as any,
      start_date: form.start_date,
      end_date: form.end_date,
      days,
      reason: form.reason || null,
      status: 'pending',
      approval_id: approval.id,
    });

    if (leaveErr) {
      toast({ title: '휴가 신청 실패', description: leaveErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 3) 관리자에게 알림
    await notifyAdmins(
      '새 휴가 신청',
      `${profile.name_kr}님이 ${typeLabel} ${days}일을 신청했습니다.`,
      'approval',
      approval.id,
    );

    toast({ title: '휴가 신청 완료', description: '결재 승인 후 자동 반영됩니다.' });
    setSubmitting(false);
    onOpenChange(false);
    onCreated();
  };

  const days = computeDays();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>휴가 / 연차 신청</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>유형</Label>
            <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>시작일</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: form.leave_type === 'half_day' ? e.target.value : (f.end_date < e.target.value ? e.target.value : f.end_date) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>종료일</Label>
              <Input
                type="date"
                value={form.end_date}
                disabled={form.leave_type === 'half_day'}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            총 사용일수: <span className="font-semibold text-foreground">{days}일</span>
            {(form.leave_type === 'annual' || form.leave_type === 'half_day' || form.leave_type === 'sick') && (
              <span className="text-xs text-muted-foreground ml-2">(연차에서 차감)</span>
            )}
          </div>
          <div className="space-y-2">
            <Label>사유</Label>
            <Textarea
              placeholder="사유를 입력하세요 (병가의 경우 증상/병원 등)"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>취소</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '신청 중...' : '결재 요청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
