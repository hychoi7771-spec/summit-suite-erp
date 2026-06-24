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
import { notifyUsers, notifyAdmins } from '@/lib/notifications';
import { eachDayOfInterval, format } from 'date-fns';
import { isNonWorkingDay, loadCompanyHolidays } from '@/lib/holidays';

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const LEAVE_TYPES_FULL = [
  { value: 'annual', label: '연차' },
  { value: 'half_day', label: '반차' },
  { value: 'summer', label: '여름휴가' },
  { value: 'family_event', label: '경조사' },
  { value: 'sick', label: '병가 (연차 차감)' },
  { value: 'other', label: '기타' },
];

// 입사 1년 미만 직원용 (연차 제외, 월차/반차 사용 — 반차는 월차 0.5일 차감)
const LEAVE_TYPES_SUB_YEAR = [
  { value: 'monthly', label: '월차 (1일)' },
  { value: 'half_day_am', label: '오전반차 (9:00~14:00, 월차 0.5일 차감)' },
  { value: 'half_day_pm', label: '오후반차 (14:00~18:00, 월차 0.5일 차감)' },
  { value: 'summer', label: '여름휴가' },
  { value: 'family_event', label: '경조사' },
  { value: 'other', label: '기타' },
];

const HALF_DAY_TIME_NOTE: Record<string, string> = {
  half_day_am: '[오전반차] 9:00~14:00 (점심시간 12:00~13:00 휴게시간 제외, 4시간 사용)',
  half_day_pm: '[오후반차] 14:00~18:00 (4시간 사용)',
};

export function LeaveRequestDialog({ open, onOpenChange, onCreated }: LeaveRequestDialogProps) {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // 입사 1년 미만 직원 판별 (대표는 항상 전체 옵션)
  const isSubYear = (() => {
    if (!profile?.hire_date || userRole === 'ceo') return false;
    const anniv = new Date(profile.hire_date);
    anniv.setFullYear(anniv.getFullYear() + 1);
    return new Date() < anniv;
  })();
  const LEAVE_TYPES = isSubYear ? LEAVE_TYPES_SUB_YEAR : LEAVE_TYPES_FULL;
  const defaultType = isSubYear ? 'monthly' : 'annual';

  const [form, setForm] = useState({
    leave_type: defaultType,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm({ leave_type: defaultType, start_date: today, end_date: today, reason: '' });
      loadCompanyHolidays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType]);

  const isHalfDay = form.leave_type === 'half_day' || form.leave_type === 'half_day_am' || form.leave_type === 'half_day_pm';

  const computeDays = () => {
    if (isHalfDay) return 0.5;
    if (!form.start_date || !form.end_date) return 1;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    if (end < start) return 1;
    // 주말 및 공휴일 제외한 영업일 수 계산
    const days = eachDayOfInterval({ start, end }).filter(d => !isNonWorkingDay(d)).length;
    return days > 0 ? days : 0;
  };

  // DB에 저장되는 실제 leave_type (오전/오후반차는 half_day 로 매핑)
  const actualLeaveType = (form.leave_type === 'half_day_am' || form.leave_type === 'half_day_pm')
    ? 'half_day'
    : form.leave_type;
  const reasonWithNote = HALF_DAY_TIME_NOTE[form.leave_type]
    ? `${HALF_DAY_TIME_NOTE[form.leave_type]}${form.reason ? `\n${form.reason}` : ''}`
    : form.reason;

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
    const isCeo = userRole === 'ceo';

    let approvalId: string | null = null;

    if (isCeo) {
      // 대표: 결재 단계 없이 즉시 전결
      // UUID를 클라이언트에서 생성해 .select() 없이 INSERT → RLS SELECT 정책 무한재귀 회피
      const newApprovalId = crypto.randomUUID();
      const { error: appErr } = await supabase
        .from('approvals')
        .insert({
          id: newApprovalId,
          requester_id: profile.id,
          type: 'leave',
          title: `[${typeLabel}] ${form.start_date}${form.start_date !== form.end_date ? ` ~ ${form.end_date}` : ''} (${days}일)`,
          content: form.reason || '',
          status: 'approved',
          current_approver_id: null,
          approved_at: new Date().toISOString(),
        });

      if (appErr) {
        toast({ title: '결재 신청 실패', description: appErr?.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      approvalId = newApprovalId;

      // 휴가 신청 — 즉시 approved (트리거가 캘린더/잔액 자동 처리)
      const { error: leaveErr } = await supabase.from('leave_requests').insert({
        user_id: profile.id,
        leave_type: form.leave_type as any,
        start_date: form.start_date,
        end_date: form.end_date,
        days,
        reason: form.reason || null,
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
        approval_id: newApprovalId,
      });

      if (leaveErr) {
        toast({ title: '휴가 등록 실패', description: leaveErr.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      toast({ title: '전결 완료', description: '대표 권한으로 즉시 승인되었습니다.' });
    } else {
      // 일반 사용자: 결재선 구성 (대표만 결재)
      const { data: approverRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'ceo');

      const approverUserIds = (approverRoles ?? []).map(r => r.user_id);
      const { data: approverProfiles } = approverUserIds.length
        ? await supabase.from('profiles').select('id, user_id').in('user_id', approverUserIds)
        : { data: [] as { id: string; user_id: string }[] };

      const userIdToProfileId = new Map((approverProfiles ?? []).map(p => [p.user_id, p.id]));
      const orderedApproverProfileIds: string[] = [];
      (approverRoles ?? [])
        .filter(r => r.role === 'ceo')
        .forEach(r => {
          const pid = userIdToProfileId.get(r.user_id);
          if (pid && !orderedApproverProfileIds.includes(pid)) orderedApproverProfileIds.push(pid);
        });

      if (orderedApproverProfileIds.length === 0) {
        toast({ title: '결재자 없음', description: '대표 계정이 등록되어 있지 않습니다.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      // UUID를 클라이언트에서 생성해 .select() 없이 INSERT → RLS SELECT 정책 무한재귀 회피
      const newApprovalId = crypto.randomUUID();
      const { error: appErr } = await supabase
        .from('approvals')
        .insert({
          id: newApprovalId,
          requester_id: profile.id,
          type: 'leave',
          title: `[${typeLabel}] ${form.start_date}${form.start_date !== form.end_date ? ` ~ ${form.end_date}` : ''} (${days}일)`,
          content: form.reason || '',
          status: 'pending',
          current_approver_id: orderedApproverProfileIds[0],
        });

      if (appErr) {
        toast({ title: '결재 신청 실패', description: appErr?.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      approvalId = newApprovalId;

      const steps = orderedApproverProfileIds.map((approverId, idx) => ({
        approval_id: newApprovalId,
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

      const { error: leaveErr } = await supabase.from('leave_requests').insert({
        user_id: profile.id,
        leave_type: form.leave_type as any,
        start_date: form.start_date,
        end_date: form.end_date,
        days,
        reason: form.reason || null,
        status: 'pending',
        approval_id: newApprovalId,
      });

      if (leaveErr) {
        toast({ title: '휴가 신청 실패', description: leaveErr.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      await notifyUsers(
        [orderedApproverProfileIds[0]],
        '새 휴가 결재 요청',
        `${profile.name_kr}님이 ${typeLabel} ${days}일을 신청했습니다.`,
        'approval',
        newApprovalId,
      );
    }

    // 4) 여름휴가 겹침 감지 → 같은 기간(승인+대기 포함, 본인 제외) 3명 이상이면 관리자 알림
    if (form.leave_type === 'summer') {
      const { data: overlapping } = await supabase
        .from('leave_requests')
        .select('user_id, start_date, end_date, status, profiles!leave_requests_user_id_fkey(name_kr)')
        .eq('leave_type', 'summer')
        .in('status', ['approved', 'pending'])
        .lte('start_date', form.end_date)
        .gte('end_date', form.start_date)
        .neq('user_id', profile.id);

      if (overlapping && overlapping.length > 0) {
        // 신규 신청 포함하여 일자별 인원 카운트
        const dayMap = new Map<string, Set<string>>();
        const addRange = (uid: string, start: string, end: string) => {
          eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
            const key = format(d, 'yyyy-MM-dd');
            if (!dayMap.has(key)) dayMap.set(key, new Set());
            dayMap.get(key)!.add(uid);
          });
        };
        addRange(profile.id, form.start_date, form.end_date);
        overlapping.forEach((r: any) => addRange(r.user_id, r.start_date, r.end_date));

        const peakDays = Array.from(dayMap.entries())
          .filter(([, users]) => users.size >= 3)
          .sort(([a], [b]) => a.localeCompare(b));

        if (peakDays.length > 0) {
          const firstDay = peakDays[0][0];
          const lastDay = peakDays[peakDays.length - 1][0];
          const maxOverlap = Math.max(...peakDays.map(([, u]) => u.size));
          const rangeText = firstDay === lastDay ? firstDay : `${firstDay} ~ ${lastDay}`;
          await notifyAdmins(
            '⚠️ 여름휴가 일정 겹침 알림',
            `${rangeText} 기간에 최대 ${maxOverlap}명이 여름휴가로 겹칩니다. (${profile.name_kr}님 신청 포함)`,
            'leave_overlap',
            approvalId ?? undefined,
          );
        }
      }
    }

    if (!isCeo) {
      toast({ title: '휴가 신청 완료', description: '결재 승인 후 자동 반영됩니다.' });
    }
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
            {form.leave_type === 'monthly' && (
              <span className="text-xs text-muted-foreground ml-2">(월차에서 차감)</span>
            )}
            {isSubYear && (
              <div className="text-xs text-muted-foreground mt-1">입사 1년 미만은 월차만 사용 가능합니다.</div>
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
