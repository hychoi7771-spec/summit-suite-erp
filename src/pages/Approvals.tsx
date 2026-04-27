import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Receipt, Briefcase, CalendarDays, CheckCircle2, XCircle, Clock, ChevronRight, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { notifyAdmins, notifyUser } from '@/lib/notifications';

const typeLabels: Record<string, string> = {
  document: '문서 기안',
  expense: '경비 결재',
  project: '프로젝트 제출',
  leave: '휴가/근태 신청',
};

const typeIcons: Record<string, any> = {
  document: FileText,
  expense: Receipt,
  project: Briefcase,
  leave: CalendarDays,
};

const statusLabels: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const roleOrder: Record<string, number> = {
  ceo: 0, general_director: 1, deputy_gm: 2, md: 3, designer: 4, staff: 5,
};

export default function Approvals() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({ title: '', type: 'document' as string, content: '' });
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', type: 'document' as string, content: '' });

  const fetchData = async () => {
    const [appRes, profRes, roleRes, stepRes] = await Promise.all([
      supabase.from('approvals').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('approval_steps').select('*').order('step_order', { ascending: true }),
    ]);
    setApprovals(appRes.data || []);
    setProfiles(profRes.data || []);
    setRoles(roleRes.data || []);
    setSteps(stepRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('approvals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getProfileName = (id: string) => profiles.find(p => p.id === id)?.name || '—';
  const getProfileRole = (profileId: string) => {
    const p = profiles.find(pr => pr.id === profileId);
    if (!p) return null;
    return roles.find(r => r.user_id === p.user_id)?.role || null;
  };

  // Build approval chain: 담당자 → 총괄이사 → 대표이사 (간략화)
  const buildApprovalChain = (requesterId: string) => {
    const requesterRole = getProfileRole(requesterId);

    // Chain: general_director first, then ceo
    const targetRoles: string[] = [];
    if (requesterRole !== 'general_director' && requesterRole !== 'ceo') {
      targetRoles.push('general_director');
    }
    if (requesterRole !== 'ceo') {
      targetRoles.push('ceo');
    }

    const chain = targetRoles
      .map(role => {
        const userRole = roles.find(r => r.role === role);
        if (!userRole) return null;
        const prof = profiles.find(p => p.user_id === userRole.user_id && p.id !== requesterId);
        return prof;
      })
      .filter(Boolean);

    return chain;
  };

  const handleCreate = async () => {
    if (!profile || !form.title.trim()) return;

    const chain = buildApprovalChain(profile.id);
    const firstApprover = chain.length > 0 ? chain[0].id : null;

    const { data: approval, error } = await supabase.from('approvals').insert({
      title: form.title,
      type: form.type as any,
      content: form.content,
      requester_id: profile.id,
      current_approver_id: firstApprover,
    }).select().single();

    if (error || !approval) {
      toast({ title: '오류', description: '결재 요청 생성에 실패했습니다.', variant: 'destructive' });
      return;
    }

    // Insert approval steps
    if (chain.length > 0) {
      const stepsData = chain.map((p, i) => ({
        approval_id: approval.id,
        approver_id: p.id,
        step_order: i,
      }));
      await supabase.from('approval_steps').insert(stepsData);
    }

    // Notify admins about new approval request
    await notifyAdmins(
      '새 결재 요청',
      `${profile.name_kr}님이 [${typeLabels[form.type]}] "${form.title}" 결재를 요청했습니다.`,
      'approval',
      approval.id
    );

    // Notify first approver
    if (firstApprover) {
      await notifyUser(firstApprover, '결재 대기', `${profile.name_kr}님의 "${form.title}" 결재가 대기 중입니다.`, 'approval', approval.id);
    }

    toast({ title: '성공', description: '결재 요청이 생성되었습니다.' });
    setShowCreate(false);
    setForm({ title: '', type: 'document', content: '' });
    fetchData();
  };

  const handleApprove = async (approval: any) => {
    if (!profile) return;

    // Mark current step as approved
    const currentStep = steps.find(s => s.approval_id === approval.id && s.approver_id === profile.id && s.status === 'pending');
    if (currentStep) {
      await supabase.from('approval_steps').update({ status: 'approved', acted_at: new Date().toISOString() }).eq('id', currentStep.id);
    }

    // Find next pending step
    const approvalSteps = steps
      .filter(s => s.approval_id === approval.id)
      .sort((a, b) => a.step_order - b.step_order);
    const nextStep = approvalSteps.find(s => s.id !== currentStep?.id && s.status === 'pending');

    if (nextStep) {
      await supabase.from('approvals').update({ current_approver_id: nextStep.approver_id }).eq('id', approval.id);
    } else {
      await supabase.from('approvals').update({
        status: 'approved',
        current_approver_id: null,
        approved_at: new Date().toISOString(),
      }).eq('id', approval.id);

      // 휴가 결재 최종 승인 시 → leave_requests 자동 승인 (트리거가 캘린더/잔액 처리)
      if (approval.type === 'leave') {
        await supabase.from('leave_requests')
          .update({ status: 'approved', approved_by: profile.id })
          .eq('approval_id', approval.id);
      }
    }

    // Notify requester about approval
    await notifyUser(approval.requester_id, '결재 승인', `"${approval.title}" 결재가 ${nextStep ? '다음 단계로 진행' : '최종 승인'}되었습니다.`, 'approval', approval.id);

    // Notify next approver if exists
    if (nextStep) {
      await notifyUser(nextStep.approver_id, '결재 대기', `"${approval.title}" 결재가 대기 중입니다.`, 'approval', approval.id);
    }

    toast({ title: '승인 완료' });
    setSelectedApproval(null);
    fetchData();
  };

  const handleReject = async (approval: any, reason: string) => {
    if (!profile) return;

    const currentStep = steps.find(s => s.approval_id === approval.id && s.approver_id === profile.id && s.status === 'pending');
    if (currentStep) {
      await supabase.from('approval_steps').update({ status: 'rejected', comment: reason, acted_at: new Date().toISOString() }).eq('id', currentStep.id);
    }

    await supabase.from('approvals').update({
      status: 'rejected',
      current_approver_id: null,
      rejected_reason: reason,
      rejected_at: new Date().toISOString(),
    }).eq('id', approval.id);

    // 휴가 결재 반려 시 → leave_requests도 반려 처리
    if (approval.type === 'leave') {
      await supabase.from('leave_requests')
        .update({ status: 'rejected' })
        .eq('approval_id', approval.id);
    }

    // Notify requester about rejection
    await notifyUser(approval.requester_id, '결재 반려', `"${approval.title}" 결재가 반려되었습니다. 사유: ${reason}`, 'approval', approval.id);

    toast({ title: '반려 처리됨' });
    setSelectedApproval(null);
    fetchData();
  };

  const handleDelete = async (approval: any) => {
    // Delete steps first, then leave_request link, then approval
    const { error: stepErr } = await supabase.from('approval_steps').delete().eq('approval_id', approval.id);
    if (stepErr) { toast({ title: '결재 단계 삭제 실패', description: stepErr.message, variant: 'destructive' }); return; }

    if (approval.type === 'leave') {
      await supabase.from('leave_requests').delete().eq('approval_id', approval.id);
    }

    const { error } = await supabase.from('approvals').delete().eq('id', approval.id);
    if (error) { toast({ title: '결재 삭제 실패', description: error.message, variant: 'destructive' }); return; }

    toast({ title: '결재가 삭제되었습니다' });
    setSelectedApproval(null);
    fetchData();
  };

  const openEdit = (approval: any) => {
    setEditTarget(approval);
    setEditForm({ title: approval.title, type: approval.type, content: approval.content || '' });
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.title.trim()) {
      toast({ title: '제목을 입력해주세요', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('approvals')
      .update({ title: editForm.title, type: editForm.type as any, content: editForm.content })
      .eq('id', editTarget.id);
    if (error) { toast({ title: '수정 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '결재가 수정되었습니다' });
    setEditTarget(null);
    setSelectedApproval(null);
    fetchData();
  };

  const filtered = approvals.filter(a => {
    if (tab === 'my') return a.requester_id === profile?.id;
    if (tab === 'pending') return a.current_approver_id === profile?.id && a.status === 'pending';
    return true;
  });

  const pendingCount = approvals.filter(a => a.current_approver_id === profile?.id && a.status === 'pending').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">전자결재</h1>
          <p className="text-sm text-muted-foreground">문서 기안, 경비 결재, 프로젝트 제출, 휴가/근태 신청</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />새 결재 요청
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="my">내 요청</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            결재 대기
            {pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">결재 내역이 없습니다.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(approval => {
                const Icon = typeIcons[approval.type] || FileText;
                const isMyApproval = approval.current_approver_id === profile?.id && approval.status === 'pending';
                return (
                  <Card
                    key={approval.id}
                    className={`cursor-pointer transition-colors hover:bg-accent/5 ${isMyApproval ? 'border-warning/40' : ''}`}
                    onClick={() => setSelectedApproval(approval)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isMyApproval ? 'bg-warning/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${isMyApproval ? 'text-warning' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{approval.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[approval.type]}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>기안자: {getProfileName(approval.requester_id)}</span>
                          <span>{format(new Date(approval.created_at), 'yyyy.MM.dd')}</span>
                          {approval.current_approver_id && approval.status === 'pending' && (
                            <span className="text-warning">현재 결재자: {getProfileName(approval.current_approver_id)}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${statusStyles[approval.status]}`}>
                        {statusLabels[approval.status]}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>새 결재 요청</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>결재 유형</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">문서 기안</SelectItem>
                  <SelectItem value="expense">경비 결재</SelectItem>
                  <SelectItem value="project">프로젝트 제출</SelectItem>
                  <SelectItem value="leave">휴가/근태 신청</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>제목</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="결재 제목 입력" />
            </div>
            <div>
              <Label>내용</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="상세 내용 입력" rows={5} />
            </div>
            {profile && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">결재 라인 (직급 순서 자동)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-primary/10 text-primary">{getProfileName(profile.id)} (기안)</Badge>
                  {buildApprovalChain(profile.id).map((p, i) => (
                    <span key={p.id} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">{getProfileName(p.id)}</Badge>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim()}>요청 제출</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <ApprovalDetail
        approval={selectedApproval}
        steps={steps.filter(s => s.approval_id === selectedApproval?.id).sort((a, b) => a.step_order - b.step_order)}
        profiles={profiles}
        currentProfileId={profile?.id}
        onClose={() => setSelectedApproval(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        getProfileName={getProfileName}
      />
    </div>
  );
}

function ApprovalDetail({ approval, steps, profiles, currentProfileId, onClose, onApprove, onReject, onDelete, isAdmin, getProfileName }: any) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  if (!approval) return null;

  const isCurrentApprover = approval.current_approver_id === currentProfileId && approval.status === 'pending';

  return (
    <Dialog open={!!approval} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {approval.title}
            <Badge variant="outline" className={statusStyles[approval.status]}>{statusLabels[approval.status]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">유형:</span> <span className="font-medium">{typeLabels[approval.type]}</span></div>
            <div><span className="text-muted-foreground">기안자:</span> <span className="font-medium">{getProfileName(approval.requester_id)}</span></div>
            <div><span className="text-muted-foreground">기안일:</span> <span>{format(new Date(approval.created_at), 'yyyy.MM.dd HH:mm')}</span></div>
            {approval.approved_at && <div><span className="text-muted-foreground">승인일:</span> <span>{format(new Date(approval.approved_at), 'yyyy.MM.dd HH:mm')}</span></div>}
            {approval.rejected_at && <div><span className="text-muted-foreground">반려일:</span> <span>{format(new Date(approval.rejected_at), 'yyyy.MM.dd HH:mm')}</span></div>}
          </div>

          {approval.content && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">내용</p>
              <p className="text-sm whitespace-pre-wrap">{approval.content}</p>
            </div>
          )}

          {approval.rejected_reason && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-xs font-medium text-destructive mb-1">반려 사유</p>
              <p className="text-sm">{approval.rejected_reason}</p>
            </div>
          )}

          {/* Approval chain */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">결재 라인</p>
            <div className="space-y-2">
              {steps.map((step: any, i: number) => (
                <div key={step.id} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">{i + 1}</div>
                  <span className="font-medium">{getProfileName(step.approver_id)}</span>
                  {step.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {step.status === 'rejected' && <XCircle className="h-4 w-4 text-destructive" />}
                  {step.status === 'pending' && <Clock className="h-4 w-4 text-warning" />}
                  <Badge variant="outline" className={`text-[10px] ${statusStyles[step.status]}`}>{statusLabels[step.status]}</Badge>
                  {step.comment && <span className="text-xs text-muted-foreground">— {step.comment}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>결재 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 결재 내용을 영구 삭제합니다. 결재 단계와{approval.type === 'leave' ? ' 연결된 휴가 신청도' : ''} 함께 삭제됩니다. 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(approval)}
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isCurrentApprover && (
            <div className="flex gap-2 ml-auto">
              {!showReject ? (
                <>
                  <Button variant="outline" className="text-destructive" onClick={() => setShowReject(true)}>반려</Button>
                  <Button onClick={() => onApprove(approval)} className="bg-success hover:bg-success/90 text-success-foreground">승인</Button>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <Textarea placeholder="반려 사유를 입력하세요" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowReject(false)}>취소</Button>
                    <Button variant="destructive" size="sm" onClick={() => { onReject(approval, rejectReason); setRejectReason(''); setShowReject(false); }} disabled={!rejectReason.trim()}>반려 확인</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
