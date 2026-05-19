import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Calendar, Wallet, FileText } from 'lucide-react';
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

/**
 * 대표(ceo) 로그인 시 미결재 건을 팝업 다이얼로그로 표시.
 * status='pending' 이며 current_approver_id가 본인인 모든 건(과거 미승인 포함).
 * 세션당 1회 노출.
 */
export function CEOPendingApprovalDialog() {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);

  useEffect(() => {
    if (!user || !profile || userRole !== 'ceo') return;

    const sessionFlag = `${SESSION_KEY}:${user.id}`;
    if (sessionStorage.getItem(sessionFlag)) return;

    (async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('id, title, type, created_at, requester_id')
        .eq('current_approver_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) return;

      // 기안자 이름 조회
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
            승인이 필요한 항목이 있습니다. 항목을 클릭하면 바로 결재함으로 이동합니다.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] pr-3">
          <ul className="space-y-2">
            {items.map((item) => {
              const meta = typeMeta[item.type] || typeMeta.general;
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent hover:border-warning/50 transition p-3 flex items-start gap-3"
                  >
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
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}{' '}
                        요청
                      </div>
                    </div>
                  </button>
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
