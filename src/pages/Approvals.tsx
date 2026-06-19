import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Plus, FileText, Receipt, Briefcase, CalendarDays, CheckCircle2, XCircle, Clock, ChevronRight, Trash2, AlertCircle, Inbox, Send, ThumbsUp, ThumbsDown, Paperclip, Eye, X as XIcon, Upload } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { notifyAdmins, notifyUser } from '@/lib/notifications';
import { AttachmentViewer, AttachmentEntry, getExt } from '@/components/approvals/AttachmentViewer';
import { APPROVAL_CATEGORIES, getCategoryByKey, type ApprovalCategoryKey } from '@/lib/approvalCategories';

const ALLOWED_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
const ATTACH_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp';

// Stored as "name||url" inside approvals.attachment_urls (text[])
// `url` can be either a storage path (preferred, private bucket) or a legacy public URL.
function parseAttachments(arr: string[] | null | undefined): AttachmentEntry[] {
  if (!arr) return [];
  return arr.map(s => {
    const [name, ...rest] = s.split('||');
    const url = rest.join('||');
    if (!url) return { name: s.split('/').pop() || s, url: s };
    return { name, url };
  });
}
function serializeAttachments(items: AttachmentEntry[]): string[] {
  return items.map(i => `${i.name}||${i.url}`);
}

// Extract storage path from either a legacy public URL or a raw path.
function extractStoragePath(stored: string): string {
  const marker = '/approval-attachments/';
  const idx = stored.indexOf(marker);
  if (idx >= 0) return stored.slice(idx + marker.length).split('?')[0];
  return stored;
}

async function resolveAttachment(a: AttachmentEntry): Promise<AttachmentEntry> {
  const path = extractStoragePath(a.url);
  const { data, error } = await supabase
    .storage.from('approval-attachments')
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) return a;
  return { name: a.name, url: data.signedUrl };
}

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
  ceo: 0, general_director: 1, managing_director: 2, deputy_gm: 3, md: 4, designer: 5, assistant_manager: 6, staff: 7,
};

export default function Approvals() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const categoryParam = (searchParams.get('category') as ApprovalCategoryKey | null) || null;
  const activeCategory = getCategoryByKey(categoryParam);
  const initialTab = searchParams.get('tab') || (categoryParam ? 'all' : 'pending');
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
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

  // Form state
  const [form, setForm] = useState({ title: '', type: 'document' as string, content: '', subcategory: '' as string });
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', type: 'document' as string, content: '' });
  const [editAttachments, setEditAttachments] = useState<AttachmentEntry[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: File[]): Promise<AttachmentEntry[]> => {
    const out: AttachmentEntry[] = [];
    for (const file of files) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        toast({ title: '지원하지 않는 파일', description: `${file.name} (허용: pdf, doc(x), xls(x), ppt(x), 이미지)`, variant: 'destructive' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: '파일이 너무 큼', description: `${file.name}는 10MB를 초과합니다.`, variant: 'destructive' });
        continue;
      }
      // URL-safe 파일명: 영문/숫자/점/하이픈만 허용, 한글 등은 모두 밑줄로 치환
      const safeName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^\w.\-]/g, '_')
        .replace(/_+/g, '_');
      const path = `${profile?.id || 'anon'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
      const contentType = file.type || 'application/octet-stream';
      const { error } = await supabase.storage.from('approval-attachments').upload(path, file, {
        contentType,
        upsert: false,
      });
      if (error) {
        console.error('[attachment upload error]', { file: file.name, path, error });
        toast({ title: '업로드 실패', description: `${file.name}: ${error.message}`, variant: 'destructive' });
        continue;
      }
      // Store the storage path (private bucket); resolve to signed URL on view.
      out.push({ name: file.name, url: path });
    }
    return out;
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('approvals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // 사이드바에서 카테고리 전환 시 탭을 '전체'로 자동 변경하여 결과가 보이도록
  useEffect(() => {
    if (categoryParam) setTab(searchParams.get('tab') || 'all');
  }, [categoryParam]);


  const getProfileName = (id: string) => profiles.find(p => p.id === id)?.name || '—';
  const getProfileRole = (profileId: string) => {
    const p = profiles.find(pr => pr.id === profileId);
    if (!p) return null;
    return roles.find(r => r.user_id === p.user_id)?.role || null;
  };

  // Build approval chain: 담당자 → 대표이사 (단일 결재자)
  const buildApprovalChain = (requesterId: string) => {
    const requesterRole = getProfileRole(requesterId);

    // 대표만 결재 가능. 본인이 대표면 chain은 비어있음(즉시 전결)
    const targetRoles: string[] = [];
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

    const requesterRole = getProfileRole(profile.id);
    const isCeo = requesterRole === 'ceo';

    const chain = buildApprovalChain(profile.id);
    const firstApprover = chain.length > 0 ? chain[0].id : null;

    setUploading(true);
    let uploaded: AttachmentEntry[] = [];
    if (createFiles.length > 0) {
      uploaded = await uploadFiles(createFiles);
    }

    const newApprovalId = crypto.randomUUID();
    const { error } = await supabase.from('approvals').insert({
      id: newApprovalId,
      title: form.title,
      type: form.type as any,
      content: form.content,
      subcategory: form.subcategory || null,
      requester_id: profile.id,
      current_approver_id: isCeo ? null : firstApprover,
      status: isCeo ? 'approved' : 'pending',
      approved_at: isCeo ? new Date().toISOString() : null,
      attachment_urls: serializeAttachments(uploaded),
    } as any);
    setUploading(false);

    if (error) {
      toast({ title: '오류', description: '결재 요청 생성에 실패했습니다: ' + error.message, variant: 'destructive' });
      return;
    }

    // 일반 사용자: 결재선 생성
    if (!isCeo && chain.length > 0) {
      const stepsData = chain.map((p, i) => ({
        approval_id: newApprovalId,
        approver_id: p.id,
        step_order: i,
      }));
      await supabase.from('approval_steps').insert(stepsData);
    }

    if (isCeo) {
      toast({ title: '전결 완료', description: '대표 권한으로 즉시 승인 처리되었습니다.' });
    } else {
      await notifyAdmins(
        '새 결재 요청',
        `${profile.name_kr}님이 [${typeLabels[form.type]}] "${form.title}" 결재를 요청했습니다.`,
        'approval',
        newApprovalId
      );
      if (firstApprover) {
        await notifyUser(firstApprover, '결재 대기', `${profile.name_kr}님의 "${form.title}" 결재가 대기 중입니다.`, 'approval', newApprovalId);
      }
      toast({ title: '성공', description: '결재 요청이 생성되었습니다.' });
    }

    setShowCreate(false);
    setForm({ title: '', type: 'document', content: '', subcategory: '' });
    setCreateFiles([]);
    fetchData();
  };

  const handleApprove = async (approval: any) => {
    if (!profile) return;

    // 현재 결재 단계 승인 처리
    const currentStep = steps.find(s => s.approval_id === approval.id && s.approver_id === profile.id && s.status === 'pending');
    if (currentStep) {
      const { error: stepErr } = await supabase.from('approval_steps')
        .update({ status: 'approved', acted_at: new Date().toISOString() })
        .eq('id', currentStep.id);
      if (stepErr) {
        toast({ title: '결재 단계 처리 실패', description: stepErr.message, variant: 'destructive' });
        return;
      }
    }

    // 다음 결재 단계 확인
    const approvalSteps = steps
      .filter(s => s.approval_id === approval.id)
      .sort((a, b) => a.step_order - b.step_order);
    const nextStep = approvalSteps.find(s => s.id !== currentStep?.id && s.status === 'pending');

    if (nextStep) {
      const { error: nextErr } = await supabase.from('approvals')
        .update({ current_approver_id: nextStep.approver_id })
        .eq('id', approval.id);
      if (nextErr) {
        toast({ title: '결재 진행 실패', description: nextErr.message, variant: 'destructive' });
        return;
      }
    } else {
      // 최종 승인: approvals 상태 변경 → trg_sync_leave_from_approval 트리거가 leave_requests 자동 처리
      const { error: appErr } = await supabase.from('approvals').update({
        status: 'approved',
        current_approver_id: null,
        approved_at: new Date().toISOString(),
      }).eq('id', approval.id);
      if (appErr) {
        toast({ title: '승인 처리 실패', description: appErr.message, variant: 'destructive' });
        return;
      }

      // 트리거가 leave_requests를 자동 처리하나 approved_by 보정
      if (approval.type === 'leave') {
        await supabase.from('leave_requests')
          .update({ approved_by: profile.id })
          .eq('approval_id', approval.id);
      }
    }

    await notifyUser(approval.requester_id, '결재 승인', `"${approval.title}" 결재가 ${nextStep ? '다음 단계로 진행' : '최종 승인'}되었습니다.`, 'approval', approval.id);
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
    // approval_steps는 approval_id ON DELETE CASCADE → approvals 삭제 시 자동 처리
    // leave_requests.approval_id는 ON DELETE SET NULL → 별도 삭제 필요
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
    setEditAttachments(parseAttachments(approval.attachment_urls));
    setEditNewFiles([]);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.title.trim()) {
      toast({ title: '제목을 입력해주세요', variant: 'destructive' });
      return;
    }
    setUploading(true);
    let merged = [...editAttachments];
    if (editNewFiles.length > 0) {
      const uploaded = await uploadFiles(editNewFiles);
      merged = [...merged, ...uploaded];
    }
    const { error } = await supabase
      .from('approvals')
      .update({
        title: editForm.title,
        type: editForm.type as any,
        content: editForm.content,
        attachment_urls: serializeAttachments(merged),
      })
      .eq('id', editTarget.id);
    setUploading(false);
    if (error) { toast({ title: '수정 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '결재가 수정되었습니다' });
    setEditTarget(null);
    setSelectedApproval(null);
    setEditNewFiles([]);
    fetchData();
  };

  // 카테고리 필터: 하위 메뉴에서 진입 시 subcategory(또는 type)로 좁힘
  const categoryFiltered = activeCategory
    ? approvals.filter(a => a.subcategory === activeCategory.key || (!a.subcategory && a.type === activeCategory.type && activeCategory.key === 'general_document'))
    : approvals;

  const filtered = categoryFiltered.filter(a => {
    if (tab === 'my') return a.requester_id === profile?.id;
    if (tab === 'pending') return a.current_approver_id === profile?.id && a.status === 'pending';
    if (tab === 'approved') return a.status === 'approved';
    if (tab === 'rejected') return a.status === 'rejected';
    return true;
  });

  const pendingCount = approvals.filter(a => a.current_approver_id === profile?.id && a.status === 'pending').length;
  const myCount = approvals.filter(a => a.requester_id === profile?.id).length;
  const myPendingCount = approvals.filter(a => a.requester_id === profile?.id && a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  const handleTabChange = (v: string) => {
    setTab(v);
    const next: Record<string, string> = {};
    if (v !== 'all') next.tab = v;
    if (categoryParam) next.category = categoryParam;
    setSearchParams(next, { replace: true });
  };

  // 카테고리별 새 결재 버튼: 템플릿 미리 채워 다이얼로그 오픈
  const openCreateWithCategory = (catKey?: ApprovalCategoryKey) => {
    const cat = catKey ? getCategoryByKey(catKey) : activeCategory;
    if (cat && cat.type !== 'leave' && cat.type !== 'expense') {
      setForm({
        title: '',
        type: cat.type,
        content: cat.template || '',
        subcategory: cat.key,
      });
    } else {
      setForm({ title: '', type: 'document', content: '', subcategory: '' });
    }
    setShowCreate(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {activeCategory ? (
              <>
                <activeCategory.icon className="h-6 w-6 text-primary" />
                {activeCategory.label}
              </>
            ) : (
              '전자결재'
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeCategory
              ? `${activeCategory.label} 결재 요청 및 진행 현황`
              : '문서 기안, 경비 결재, 프로젝트 제출, 휴가/근태 신청'}
          </p>
        </div>
        <Button onClick={() => openCreateWithCategory()} size="lg" className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          {activeCategory ? `${activeCategory.label} 작성` : '새 결재 요청'}
        </Button>
      </div>

      {/* 미결재 알림 배너 */}
      {pendingCount > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="h-10 w-10 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                결재 대기 <span className="text-warning">{pendingCount}건</span>이 있습니다
              </p>
              <p className="text-xs text-muted-foreground">승인 또는 반려 처리가 필요합니다.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleTabChange('pending')}>
              바로 처리하기 <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => handleTabChange('pending')} className={`text-left rounded-xl border p-4 transition-all hover:shadow-sm ${tab === 'pending' ? 'border-warning bg-warning/5' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">결재 대기</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
        </button>
        <button onClick={() => handleTabChange('my')} className={`text-left rounded-xl border p-4 transition-all hover:shadow-sm ${tab === 'my' ? 'border-primary bg-primary/5' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between mb-2">
            <Send className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">내 요청 / 진행중</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{myCount}<span className="text-sm font-normal text-muted-foreground"> / {myPendingCount}</span></p>
        </button>
        <button onClick={() => handleTabChange('approved')} className={`text-left rounded-xl border p-4 transition-all hover:shadow-sm ${tab === 'approved' ? 'border-success bg-success/5' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">승인됨</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
        </button>
        <button onClick={() => handleTabChange('rejected')} className={`text-left rounded-xl border p-4 transition-all hover:shadow-sm ${tab === 'rejected' ? 'border-destructive bg-destructive/5' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between mb-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">반려됨</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
        </button>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="pending" className="relative gap-1.5">
            <Inbox className="h-3.5 w-3.5" /> 결재 대기
            {pendingCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-1.5"><Send className="h-3.5 w-3.5" /> 내 요청</TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> 승인</TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5"><XCircle className="h-3.5 w-3.5" /> 반려</TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              결재 내역이 없습니다.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(approval => {
                const Icon = typeIcons[approval.type] || FileText;
                const isMyApproval = approval.current_approver_id === profile?.id && approval.status === 'pending';
                const isMine = approval.requester_id === profile?.id;
                return (
                  <Card
                    key={approval.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${isMyApproval ? 'border-warning/50 bg-warning/[0.02] ring-1 ring-warning/20' : ''}`}
                    onClick={() => setSelectedApproval(approval)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                        approval.status === 'approved' ? 'bg-success/10' :
                        approval.status === 'rejected' ? 'bg-destructive/10' :
                        isMyApproval ? 'bg-warning/15' : 'bg-muted'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          approval.status === 'approved' ? 'text-success' :
                          approval.status === 'rejected' ? 'text-destructive' :
                          isMyApproval ? 'text-warning' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{approval.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[approval.type]}</Badge>
                          {isMine && <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5 text-primary border-primary/20">내 기안</Badge>}
                          {isMyApproval && <Badge className="text-[10px] shrink-0 bg-warning text-warning-foreground animate-pulse">처리 필요</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>기안: {getProfileName(approval.requester_id)}</span>
                          <span>·</span>
                          <span>{format(new Date(approval.created_at), 'yyyy.MM.dd HH:mm')}</span>
                          {approval.current_approver_id && approval.status === 'pending' && (
                            <>
                              <span>·</span>
                              <span className="text-warning font-medium">대기: {getProfileName(approval.current_approver_id)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${statusStyles[approval.status]} font-semibold`}>
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
            <div>
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> 첨부파일</Label>
              <div className="mt-1.5">
                <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  파일 선택 (PDF, Word, Excel, PowerPoint, 이미지 / 최대 25MB)
                  <input
                    type="file"
                    multiple
                    accept={ATTACH_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setCreateFiles(prev => [...prev, ...files]);
                      e.target.value = '';
                    }}
                  />
                </label>
                {createFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {createFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                        <span className="truncate flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)}KB)</span>
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setCreateFiles(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
            <Button onClick={handleCreate} disabled={!form.title.trim() || uploading}>{uploading ? '업로드 중...' : '요청 제출'}</Button>
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
        onEdit={openEdit}
        isAdmin={isAdmin}
        getProfileName={getProfileName}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>결재 요청 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>결재 유형</Label>
              <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
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
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>내용</Label>
              <Textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} rows={5} />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> 첨부파일</Label>
              <div className="mt-1.5 space-y-2">
                {editAttachments.length > 0 && (
                  <ul className="space-y-1">
                    {editAttachments.map((a, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                        <span className="truncate flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {a.name}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setEditAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {editNewFiles.length > 0 && (
                  <ul className="space-y-1">
                    {editNewFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-xs bg-primary/5 border border-primary/20 rounded px-2 py-1">
                        <span className="truncate flex items-center gap-1.5">
                          <Upload className="h-3.5 w-3.5 text-primary shrink-0" />
                          {f.name} <span className="text-muted-foreground">(신규)</span>
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setEditNewFiles(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  파일 추가
                  <input
                    type="file"
                    multiple
                    accept={ATTACH_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEditNewFiles(prev => [...prev, ...files]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ※ 수정은 결재 승인 전(대기 상태)인 본인 기안에 한해 가능합니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>취소</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.title.trim() || uploading}>{uploading ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalDetail({ approval, steps, profiles, currentProfileId, onClose, onApprove, onReject, onDelete, onEdit, isAdmin, getProfileName }: any) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentEntry | null>(null);

  if (!approval) return null;
  const attachments = parseAttachments(approval.attachment_urls);

  const isCurrentApprover = approval.current_approver_id === currentProfileId && approval.status === 'pending';
  const isOwnerPending = approval.requester_id === currentProfileId && approval.status === 'pending';
  const canDelete = isAdmin || isOwnerPending;
  const canEdit = isOwnerPending;

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

          {attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> 첨부파일 ({attachments.length})
              </p>
              <ul className="space-y-1.5">
                {attachments.map((a, i) => {
                  const ext = getExt(a.name);
                  return (
                    <li key={i} className="flex items-center justify-between gap-2 bg-muted/30 hover:bg-muted/60 transition-colors rounded-md px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{a.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0">{ext || 'file'}</Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={async () => setViewerAttachment(await resolveAttachment(a))}>
                          <Eye className="h-3.5 w-3.5" /> 보기
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
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
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(approval)}>
                수정
              </Button>
            )}
            {canDelete && (
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
          </div>
          {isCurrentApprover && (
            <div className="flex gap-2 ml-auto w-full sm:w-auto">
              {!showReject ? (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 sm:flex-none border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                    onClick={() => setShowReject(true)}
                  >
                    <ThumbsDown className="h-4 w-4" /> 반려
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => onApprove(approval)}
                    className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground gap-2 shadow-sm"
                  >
                    <ThumbsUp className="h-4 w-4" /> 승인
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <Label className="text-xs text-destructive font-medium">반려 사유 (필수)</Label>
                  <Textarea
                    placeholder="반려 사유를 구체적으로 입력해주세요"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                    className="border-destructive/30 focus-visible:ring-destructive"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowReject(false); setRejectReason(''); }}>취소</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { onReject(approval, rejectReason); setRejectReason(''); setShowReject(false); }}
                      disabled={!rejectReason.trim()}
                      className="gap-1.5"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> 반려 확정
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
      <AttachmentViewer
        attachment={viewerAttachment}
        open={!!viewerAttachment}
        onClose={() => setViewerAttachment(null)}
      />
    </Dialog>
  );
}
