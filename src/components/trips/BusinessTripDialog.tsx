import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notifyUsers } from '@/lib/notifications';

export const TRANSPORT_OPTIONS = ['자차', 'KTX/기차', '고속버스', '항공', '법인차량', '기타'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  trip?: any | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function BusinessTripDialog({ open, onOpenChange, onCreated, trip }: Props) {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    destination: '',
    purpose: '',
    start_date: today(),
    end_date: today(),
    start_time: '',
    end_time: '',
    transport: '자차',
    companions: '',
    accommodation: false,
    estimated_cost: '',
    note: '',
  });

  useEffect(() => {
    if (!open) return;
    if (trip) {
      setForm({
        destination: trip.destination || '',
        purpose: trip.purpose || '',
        start_date: trip.start_date || today(),
        end_date: trip.end_date || today(),
        start_time: trip.start_time?.slice(0, 5) || '',
        end_time: trip.end_time?.slice(0, 5) || '',
        transport: trip.transport || '자차',
        companions: trip.companions || '',
        accommodation: !!trip.accommodation,
        estimated_cost: trip.estimated_cost != null ? String(trip.estimated_cost) : '',
        note: trip.note || '',
      });
    } else {
      setForm({
        destination: '', purpose: '', start_date: today(), end_date: today(),
        start_time: '', end_time: '', transport: '자차', companions: '',
        accommodation: false, estimated_cost: '', note: '',
      });
    }
  }, [open, trip]);

  const days = (() => {
    const s = new Date(form.start_date), e = new Date(form.end_date);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  })();

  const payload = () => ({
    destination: form.destination.trim() || '출장지 미기재',
    purpose: form.purpose.trim() || null,
    start_date: form.start_date,
    end_date: form.end_date < form.start_date ? form.start_date : form.end_date,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    transport: form.transport || null,
    companions: form.companions.trim() || null,
    accommodation: form.accommodation,
    estimated_cost: form.estimated_cost ? Number(form.estimated_cost.replace(/[^\d]/g, '')) : null,
    note: form.note.trim() || null,
  });

  const summary = () => {
    const p = payload();
    return `[출장] ${p.destination} / ${p.start_date}${p.start_date !== p.end_date ? ` ~ ${p.end_date}` : ''} (${days}일)`;
  };

  const contentText = () => {
    const p = payload();
    return [
      `출장지: ${p.destination}`,
      `기간: ${p.start_date} ~ ${p.end_date} (${days}일)`,
      p.start_time || p.end_time ? `시간: ${p.start_time || '-'} ~ ${p.end_time || '-'}` : null,
      `이동수단: ${p.transport || '-'}`,
      `숙박: ${p.accommodation ? '있음' : '없음'}`,
      p.companions ? `동행자: ${p.companions}` : null,
      p.estimated_cost ? `예상 경비: ${p.estimated_cost.toLocaleString()}원` : null,
      p.purpose ? `\n[출장 목적]\n${p.purpose}` : null,
      p.note ? `\n[비고]\n${p.note}` : null,
    ].filter(Boolean).join('\n');
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);

    // 수정 모드: 승인 전 본인 신청만 내용 갱신
    if (trip) {
      const { error } = await (supabase.from('business_trips' as any) as any).update(payload()).eq('id', trip.id);
      if (!error && trip.approval_id) {
        await supabase.from('approvals').update({ title: summary(), content: contentText() }).eq('id', trip.approval_id);
      }
      setSubmitting(false);
      if (error) {
        toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: '수정 완료', description: '출장 신청이 수정되었습니다.' });
      onOpenChange(false);
      onCreated();
      return;
    }

    const isCeo = userRole === 'ceo';
    const approvalId = crypto.randomUUID();

    if (isCeo) {
      const { error: appErr } = await supabase.from('approvals').insert({
        id: approvalId,
        requester_id: profile.id,
        type: 'trip' as any,
        title: summary(),
        content: contentText(),
        status: 'approved',
        current_approver_id: null,
        approved_at: new Date().toISOString(),
      } as any);
      if (appErr) {
        setSubmitting(false);
        toast({ title: '결재 신청 실패', description: appErr.message, variant: 'destructive' });
        return;
      }
      const { error } = await (supabase.from('business_trips' as any) as any).insert({
        ...payload(),
        user_id: profile.id,
        status: 'approved',
        approval_id: approvalId,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      });
      setSubmitting(false);
      if (error) {
        toast({ title: '출장 등록 실패', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: '전결 완료', description: '대표 권한으로 즉시 승인되었습니다.' });
      onOpenChange(false);
      onCreated();
      return;
    }

    // 일반 사용자: 대표 결재선 구성
    const { data: ceoRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'ceo');
    const ceoUserIds = (ceoRoles ?? []).map(r => r.user_id);
    const { data: ceoProfiles } = ceoUserIds.length
      ? await supabase.from('profiles').select('id').in('user_id', ceoUserIds)
      : { data: [] as { id: string }[] };
    const approverIds = (ceoProfiles ?? []).map(p => p.id);
    if (approverIds.length === 0) {
      setSubmitting(false);
      toast({ title: '결재자 없음', description: '대표 계정이 등록되어 있지 않습니다.', variant: 'destructive' });
      return;
    }

    const { error: appErr } = await supabase.from('approvals').insert({
      id: approvalId,
      requester_id: profile.id,
      type: 'trip' as any,
      title: summary(),
      content: contentText(),
      status: 'pending',
      current_approver_id: approverIds[0],
    } as any);
    if (appErr) {
      setSubmitting(false);
      toast({ title: '결재 신청 실패', description: appErr.message, variant: 'destructive' });
      return;
    }
    await supabase.from('approval_steps').insert(
      approverIds.map((id, idx) => ({ approval_id: approvalId, approver_id: id, step_order: idx + 1, status: 'pending' as const })),
    );
    const { error } = await (supabase.from('business_trips' as any) as any).insert({
      ...payload(),
      user_id: profile.id,
      status: 'pending',
      approval_id: approvalId,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: '출장 신청 실패', description: error.message, variant: 'destructive' });
      return;
    }
    await notifyUsers([approverIds[0]], '새 출장 결재 요청',
      `${profile.name_kr}님이 ${payload().destination} 출장(${days}일)을 신청했습니다.`, 'approval', approvalId);
    toast({ title: '신청 완료', description: '대표 결재 대기 중입니다.' });
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trip ? '출장 신청 수정' : '출장 신청'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>출장지</Label>
            <Input value={form.destination} placeholder="예) 대구 · 거래처 A"
              onChange={e => setForm({ ...form, destination: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>시작일</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>종료일</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>출발 시각 (선택)</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>복귀 시각 (선택)</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>이동수단</Label>
              <Select value={form.transport} onValueChange={v => setForm({ ...form, transport: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSPORT_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>예상 경비 (원)</Label>
              <Input inputMode="numeric" value={form.estimated_cost} placeholder="예) 150000"
                onChange={e => setForm({ ...form, estimated_cost: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="mb-0">숙박 여부</Label>
            <Switch checked={form.accommodation} onCheckedChange={v => setForm({ ...form, accommodation: v })} />
          </div>
          <div className="space-y-2">
            <Label>동행자 (선택)</Label>
            <Input value={form.companions} placeholder="예) 공경미 실장"
              onChange={e => setForm({ ...form, companions: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>출장 목적</Label>
            <Textarea rows={3} value={form.purpose} placeholder="예) 거래처 미팅 및 매장 점검"
              onChange={e => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>비고 (선택)</Label>
            <Textarea rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">총 {days}일 일정으로 등록됩니다. 승인되면 일정(캘린더)에 자동 표시됩니다.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? '처리 중...' : trip ? '수정' : '신청'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
