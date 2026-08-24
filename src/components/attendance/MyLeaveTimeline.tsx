import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageCircleQuestion, Loader2 } from 'lucide-react';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: '연차', half_day: '반차', monthly: '월차', summer: '여름휴가',
  family_event: '경조사', sick: '병가', other: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소',
};

interface Props {
  year: number;
  myName: string;
  balance: any | null;
  /** 본인 휴가 신청 내역 */
  myRequests: any[];
}

export function MyLeaveTimeline({ year, myName, balance, myRequests }: Props) {
  const { toast } = useToast();
  const [inquiry, setInquiry] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const annual = Number(balance?.total_days ?? 0);
  const monthly = Number(balance?.monthly_total_days ?? 0);
  const usedAnnual = Number(balance?.used_days ?? 0);
  const usedMonthly = Number(balance?.monthly_used_days ?? 0);
  const total = annual + monthly;
  const used = usedAnnual + usedMonthly;
  const remaining = total - used;
  const usedPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const yearRequests = useMemo(
    () => myRequests.filter(r => (r.start_date || '').startsWith(String(year))),
    [myRequests, year],
  );

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const key = `${year}-${String(m).padStart(2, '0')}`;
      const items = yearRequests.filter(r => (r.start_date || '').startsWith(key));
      const days = items
        .filter(r => r.status === 'approved')
        .reduce((s, r) => s + Number(r.days || 0), 0);
      return { month: m, items, days };
    });
  }, [yearRequests, year]);

  const maxDays = Math.max(1, ...months.map(m => m.days));

  const sendInquiry = async () => {
    const text = inquiry.trim();
    if (!text) return;
    setSending(true);
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['ceo', 'general_director'] as any);
      const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
      if (ids.length === 0) throw new Error('관리자를 찾을 수 없습니다');
      const { error } = await (supabase as any).rpc('send_notifications', {
        _user_ids: ids,
        _title: `연차 확인 문의 (${myName})`,
        _message: `${year}년 기준 · 적립 ${total}일 / 사용 ${used}일 / 잔여 ${remaining}일\n\n${text}`,
        _type: 'leave_inquiry',
        _related_id: null,
      });
      if (error) throw error;
      toast({ title: '문의를 전달했습니다', description: '관리자 알림으로 발송되었습니다.' });
      setInquiry('');
      setOpen(false);
    } catch (e: any) {
      toast({ title: '전송 실패', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-base">{year}년 내 휴가 요약</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <MessageCircleQuestion className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">관리자에게 문의</span>
                <span className="sm:hidden">문의</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>연차 내역 문의</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                현재 요약(적립 {total}일 / 사용 {used}일 / 잔여 {remaining}일)이 함께 전달됩니다.
              </p>
              <Textarea
                value={inquiry}
                onChange={e => setInquiry(e.target.value)}
                placeholder="예) 6월 25일 오전 반차가 1일로 계산된 것 같습니다."
                rows={5}
              />
              <DialogFooter>
                <Button onClick={sendInquiry} disabled={sending || !inquiry.trim()}>
                  {sending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  문의 보내기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="연차 적립" value={annual} />
            <Stat label="월차 적립" value={monthly} />
            <Stat label="사용" value={used} tone="text-warning" />
            <Stat label="잔여" value={remaining} tone="text-primary" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>사용률</span>
              <span>{usedPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${usedPct}%` }} />
            </div>
          </div>
          {balance?.next_grant_date && (
            <p className="text-xs text-muted-foreground">
              다음 적립일: <span className="font-medium text-foreground">{balance.next_grant_date}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 사용 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {months.map(m => (
              <div key={m.month} className="flex items-start gap-2 sm:gap-3">
                <div className="w-9 shrink-0 pt-1.5 text-xs text-muted-foreground tabular-nums">{m.month}월</div>
                <div className="flex-1 min-w-0">
                  <div className="h-6 rounded-md bg-muted/60 relative overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-md transition-all"
                      style={{ width: `${(m.days / maxDays) * 100}%` }}
                    />
                    {m.days > 0 && (
                      <span className="absolute left-2 top-0 h-full flex items-center text-[11px] font-medium">
                        {m.days}일
                      </span>
                    )}
                  </div>
                  {m.items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.items.map(r => (
                        <Badge key={r.id} variant="outline" className="text-[10px] font-normal">
                          {r.start_date?.slice(5)}
                          {r.end_date && r.end_date !== r.start_date ? `~${r.end_date.slice(5)}` : ''} ·{' '}
                          {LEAVE_TYPE_LABEL[r.leave_type] || r.leave_type} · {STATUS_LABEL[r.status] || r.status}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {yearRequests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{year}년 휴가 사용 내역이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${tone || ''}`}>{value}일</p>
    </div>
  );
}
