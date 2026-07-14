import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Calendar, Wallet, FileText, Check, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const SESSION_KEY = 'ceo_pending_approval_dialog_shown';

type PendingItem = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  requester_name?: string | null;
};

const typeMeta: Record<string, { label: string; icon: any; color: string }> = {
  leave: { label: '휴가', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
  expense: { label: '경비', icon: Wallet, color: 'bg-amber-100 text-amber-700' },
  general: { label: '기안', icon: FileText, color: 'bg-slate-100 text-slate-700' },
};

export function CEOPendingApprovalDialog() {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile || userRole !== 'ceo') return;

    const sessionFlag = `${SESSION_KEY}:${user.id}`;
    if (sessionStorage.getItem(sessionFlag)) return;

    (async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('id, title, type, created_at, requester_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) return;

      const requesterIds = Array.from(new Set(data.map((d: any) => d.requester_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (requesterIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name_kr, name')
          .in('id', requesterIds);
        profs?.forEach((p: any) => nameMap.set(p.id, p.name_kr || p.name));
      }

      const enriched: PendingItem[] = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        created_at: d.created_at,
        requester_name: nameMap.get(d.requester_id) ?? null,
      }));

      sessionStorage.setItem(sessionFlag, '1');
      setItems(enriched);
      setOpen(true);
    })();
  }, [user?.id, profile?.id, userRole]);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setOpen(false);
      return next;
    });
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
    setRejectingId(null);
    setRejectReason('');
    removeItem(id);
  };

  const handleOpenApprovals = () => {
    setOpen(false);
    navigate('/approvals?tab=pending');
  };

  const handleItemClick = (id: string) => {
    setOpen(false);
    navigate(`/approvals?tab=pending&id=${id}`);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-warning" />
            결재 대기 {items.length}건
          </DialogTitle>
          <DialogDescription>
            바로 승인/반려하거나 항목 제목을 클릭해 상세 결재함으로 이동할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[460px] pr-3">
          <ul className="space-y-2">
            {items.map((item) => {
              const meta = typeMeta[item.type] || typeMeta.general;
              const Icon = meta.icon;
              const isRejecting = rejectingId === item.id;
              const isBusy = busyId === item.id;
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 rounded-md p-2 ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.requester_name ?? '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleItemClick(item.id)}
                        className="text-sm font-medium text-left hover:underline truncate block w-full"
                      >
                        {item.title}
                      </button>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}{' '}
                        요청
                      </div>
                    </div>
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
                  </div>

                  {isRejecting && (
                    <div className="mt-3 pl-11 space-y-2">
                      <Textarea
                        placeholder="반려 사유 (선택사항)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isBusy}
                          onClick={() => handleReject(item.id)}
                        >
                          반려 확정
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            나중에
          </Button>
          <Button onClick={handleOpenApprovals}>결재함 열기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
