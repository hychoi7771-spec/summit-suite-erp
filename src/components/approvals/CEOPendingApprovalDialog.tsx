import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Calendar, Wallet, FileText, Check, X, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

const SESSION_KEY = 'ceo_pending_approval_dialog_shown';

type ApprovalItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  requester_name?: string | null;
};

const typeMeta: Record<string, { label: string; icon: any; color: string }> = {
  leave: { label: '휴가', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
  expense: { label: '경비', icon: Wallet, color: 'bg-amber-100 text-amber-700' },
  general: { label: '기안', icon: FileText, color: 'bg-slate-100 text-slate-700' },
  document: { label: '기안', icon: FileText, color: 'bg-slate-100 text-slate-700' },
  project: { label: '프로젝트', icon: FileText, color: 'bg-slate-100 text-slate-700' },
};

export function CEOPendingApprovalDialog() {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ApprovalItem[]>([]);
  const [approved, setApproved] = useState<ApprovalItem[]>([]);
  const [rejected, setRejected] = useState<ApprovalItem[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState('pending');

  useEffect(() => {
    if (!user || !profile || userRole !== 'ceo') return;

    const sessionFlag = `${SESSION_KEY}:${user.id}`;
    if (sessionStorage.getItem(sessionFlag)) return;

    (async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('id, title, type, status, created_at, approved_at, rejected_at, requester_id')
        .in('status', ['pending', 'approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(300);

      if (error || !data) return;

      const requesterIds = Array.from(new Set(data.map((d: any) => d.requester_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (requesterIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name_kr, name')
          .in('id', requesterIds);
        profs?.forEach((p: any) => nameMap.set(p.id, p.name_kr || p.name));
      }

      const enriched: ApprovalItem[] = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        status: d.status,
        created_at: d.created_at,
        approved_at: d.approved_at,
        rejected_at: d.rejected_at,
        requester_name: nameMap.get(d.requester_id) ?? null,
      }));

      const p = enriched.filter((e) => e.status === 'pending').sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const a = enriched.filter((e) => e.status === 'approved');
      const r = enriched.filter((e) => e.status === 'rejected');

      sessionStorage.setItem(sessionFlag, '1');
      setPending(p);
      setApproved(a);
      setRejected(r);
      setTab(p.length > 0 ? 'pending' : 'approved');
      setOpen(true);
    })();
  }, [user?.id, profile?.id, userRole]);

  const removeItem = (id: string) => {
    setPending((prev) => prev.filter((i) => i.id !== id));
  };

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from('approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    setBusyId(null);
    if (error) {
      toast({ title: '승인 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '승인 완료' });
    const item = pending.find((p) => p.id === id);
    if (item) {
      setApproved((prev) => [{ ...item, status: 'approved', approved_at: new Date().toISOString() }, ...prev]);
    }
    removeItem(id);
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from('approvals')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_reason: rejectReason.trim() || null,
      })
      .eq('id', id);
    setBusyId(null);
    if (error) {
      toast({ title: '반려 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '반려 처리됨' });
    const item = pending.find((p) => p.id === id);
    if (item) {
      setRejected((prev) => [{ ...item, status: 'rejected', rejected_at: new Date().toISOString() }, ...prev]);
    }
    setRejectingId(null);
    setRejectReason('');
    removeItem(id);
  };

  const handleOpenApprovals = () => {
    setOpen(false);
    navigate('/approvals?tab=' + tab);
  };

  const handleItemClick = (id: string, statusTab: string) => {
    setOpen(false);
    navigate(`/approvals?tab=${statusTab}&id=${id}`);
  };

  if (!open) return null;

  const renderList = (list: ApprovalItem[], statusTab: string, showActions: boolean) => {
    if (list.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-muted-foreground">
          해당 항목이 없습니다.
        </div>
      );
    }
    return (
      <ul className="space-y-2">
        {list.map((item) => {
          const meta = typeMeta[item.type] || typeMeta.general;
          const Icon = meta.icon;
          const isRejecting = rejectingId === item.id;
          const isBusy = busyId === item.id;
          const dateStr = item.status === 'approved' && item.approved_at
            ? `${format(new Date(item.approved_at), 'MM.dd HH:mm', { locale: ko })} 승인`
            : item.status === 'rejected' && item.rejected_at
              ? `${format(new Date(item.rejected_at), 'MM.dd HH:mm', { locale: ko })} 반려`
              : `${formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ko })} 요청`;
          return (
            <li key={item.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-md p-2 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] py-0">{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">{item.requester_name ?? '—'}</span>
                    {item.status === 'approved' && (
                      <Badge className="text-[10px] py-0 bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> 승인
                      </Badge>
                    )}
                    {item.status === 'rejected' && (
                      <Badge className="text-[10px] py-0 bg-red-100 text-red-700 border-red-200">
                        <XCircle className="h-3 w-3 mr-0.5" /> 반려
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => handleItemClick(item.id, statusTab)}
                    className="text-sm font-medium text-left hover:underline truncate block w-full"
                  >
                    {item.title}
                  </button>
                  <div className="text-xs text-muted-foreground mt-1">{dateStr}</div>
                </div>
                {showActions && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      disabled={isBusy || isRejecting}
                      onClick={() => handleApprove(item.id)}
                    >
                      <Check className="h-3 w-3 mr-1" /> 승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      disabled={isBusy}
                      onClick={() => {
                        setRejectingId(isRejecting ? null : item.id);
                        setRejectReason('');
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> 반려
                    </Button>
                  </div>
                )}
              </div>

              {showActions && isRejecting && (
                <div className="mt-3 pl-11 space-y-2">
                  <Textarea
                    placeholder="반려 사유 (선택사항)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                      취소
                    </Button>
                    <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => handleReject(item.id)}>
                      반려 확정
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-warning" />
            결재 현황
          </DialogTitle>
          <DialogDescription>
            대기 중인 결재는 즉시 승인/반려하거나, 승인·반려 이력도 함께 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pending">대기 {pending.length}</TabsTrigger>
            <TabsTrigger value="approved">승인 {approved.length}</TabsTrigger>
            <TabsTrigger value="rejected">반려 {rejected.length}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-3">
            <ScrollArea className="max-h-[460px] pr-3">
              {renderList(pending, 'pending', true)}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="approved" className="mt-3">
            <ScrollArea className="max-h-[460px] pr-3">
              {renderList(approved, 'approved', false)}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="rejected" className="mt-3">
            <ScrollArea className="max-h-[460px] pr-3">
              {renderList(rejected, 'rejected', false)}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>닫기</Button>
          <Button onClick={handleOpenApprovals}>결재함 열기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
