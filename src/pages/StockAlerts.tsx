import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, PackageX, CheckCircle2, Trash2, Clock, Megaphone, AlertTriangle, Sparkles, Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { canManageStockAlerts } from '@/lib/stockAlertPermissions';
import { notifyAllUsers } from '@/lib/notifications';
import { format, differenceInDays, parseISO } from 'date-fns';

const urgencyMeta: Record<string, { label: string; cls: string }> = {
  high:   { label: '긴급',   cls: 'bg-destructive text-destructive-foreground' },
  medium: { label: '주의',   cls: 'bg-warning text-warning-foreground' },
  low:    { label: '관찰',   cls: 'bg-muted text-muted-foreground' },
};

interface Alert {
  id: string;
  product_name: string;
  stock_qty: number | null;
  expiry_date: string | null;
  urgency: 'high' | 'medium' | 'low';
  sales_channel: string | null;
  incentive_note: string | null;
  message: string | null;
  status: 'active' | 'resolved';
  created_by: string;
  notice_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function StockAlerts() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'resolved'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [thresholdDays, setThresholdDays] = useState(14);
  const [thresholdQty, setThresholdQty] = useState(20);
  const [csvRows, setCsvRows] = useState<{ product_name: string; stock_qty: number | null; expiry_date: string | null }[]>([]);
  const [form, setForm] = useState({
    product_name: '',
    stock_qty: '',
    expiry_date: '',
    urgency: 'medium' as 'high' | 'medium' | 'low',
    sales_channel: '',
    incentive_note: '',
    message: '',
  });

  const canManage = useMemo(
    () => canManageStockAlerts(userRole, profile?.id),
    [userRole, profile?.id],
  );

  const fetchData = async () => {
    const [aRes, pRes] = await Promise.all([
      supabase.from('stock_urgent_alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name_kr, avatar'),
    ]);
    setAlerts((aRes.data as Alert[]) || []);
    setProfiles(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel('stock-alerts-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_urgent_alerts' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const resetForm = () => setForm({
    product_name: '', stock_qty: '', expiry_date: '',
    urgency: 'medium', sales_channel: '', incentive_note: '', message: '',
  });

  // CSV 파일을 읽어 { product_name, stock_qty, expiry_date } 행으로 파싱
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [] as typeof csvRows;
    // 헤더 자동 감지
    const first = lines[0].split(',').map(s => s.trim().toLowerCase());
    const hasHeader = first.some(c => ['상품명','product','name','품목'].some(k => c.includes(k)))
                    || first.some(c => ['재고','stock','qty','수량'].some(k => c.includes(k)));
    const startIdx = hasHeader ? 1 : 0;
    let nameIdx = 0, qtyIdx = 1, dateIdx = 2;
    if (hasHeader) {
      first.forEach((c, i) => {
        if (['상품명','product','name','품목'].some(k => c.includes(k))) nameIdx = i;
        else if (['재고','stock','qty','수량'].some(k => c.includes(k))) qtyIdx = i;
        else if (['유통','expiry','date','기한','만료'].some(k => c.includes(k))) dateIdx = i;
      });
    }
    const rows: typeof csvRows = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const name = cols[nameIdx];
      if (!name) continue;
      const qtyRaw = cols[qtyIdx];
      const dateRaw = cols[dateIdx];
      const qty = qtyRaw && !isNaN(Number(qtyRaw)) ? Number(qtyRaw) : null;
      let date: string | null = null;
      if (dateRaw) {
        const d = dateRaw.replace(/\./g, '-').replace(/\//g, '-');
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)) {
          const [y, m, day] = d.split('-');
          date = `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      rows.push({ product_name: name, stock_qty: qty, expiry_date: date });
    }
    return rows;
  };

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    setCsvRows(rows);
    if (rows.length === 0) {
      toast({ title: 'CSV 파싱 실패', description: '상품명/수량/유통기한 열을 확인해주세요.', variant: 'destructive' });
    } else {
      toast({ title: `${rows.length}개 항목 로드`, description: '아래 후보 목록에서 등록할 항목을 선택하세요.' });
    }
  };

  // 임계치 기반 후보 자동 계산 + 긴급도 자동 산정
  const candidates = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return csvRows
      .map(r => {
        let dDay: number | null = null;
        if (r.expiry_date) {
          try { dDay = differenceInDays(parseISO(r.expiry_date), today); } catch {}
        }
        const expiryHit = dDay !== null && dDay <= thresholdDays;
        const qtyHit = r.stock_qty !== null && r.stock_qty <= thresholdQty;
        if (!expiryHit && !qtyHit) return null;
        let urgency: 'high' | 'medium' | 'low' = 'low';
        if ((dDay !== null && dDay <= 7) || (r.stock_qty !== null && r.stock_qty <= 10)) urgency = 'high';
        else if ((dDay !== null && dDay <= 14) || (r.stock_qty !== null && r.stock_qty <= 20)) urgency = 'medium';
        return { ...r, dDay, urgency };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const order = { high: 0, medium: 1, low: 2 } as const;
        if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
        return (a.dDay ?? 999) - (b.dDay ?? 999);
      }) as Array<{ product_name: string; stock_qty: number | null; expiry_date: string | null; dDay: number | null; urgency: 'high'|'medium'|'low' }>;
  }, [csvRows, thresholdDays, thresholdQty]);

  const pickCandidate = (c: typeof candidates[number]) => {
    setForm({
      product_name: c.product_name,
      stock_qty: c.stock_qty != null ? String(c.stock_qty) : '',
      expiry_date: c.expiry_date || '',
      urgency: c.urgency,
      sales_channel: '',
      incentive_note: '',
      message: `유통기한 ${c.expiry_date ?? '미상'} · 잔여 ${c.stock_qty ?? '미상'}개 — 소진 독려 부탁드립니다.`,
    });
    setCandidateDialogOpen(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!profile || !form.product_name) return;
    setSubmitting(true);

    // 1) 공지 게시판에 팝업 공지 등록
    const noticeTitle = `[재고임박 · ${urgencyMeta[form.urgency].label}] ${form.product_name} 판매 독려`;
    const noticeBody = [
      form.stock_qty ? `잔여 수량: ${form.stock_qty}` : null,
      form.expiry_date ? `유통기한/소진목표: ${form.expiry_date}` : null,
      form.sales_channel ? `판매 채널: ${form.sales_channel}` : null,
      form.incentive_note ? `인센티브: ${form.incentive_note}` : null,
      form.message ? `\n${form.message}` : null,
    ].filter(Boolean).join('\n');

    const { data: notice, error: nErr } = await supabase
      .from('notices')
      .insert({
        title: noticeTitle,
        content: noticeBody || '재고 소진을 위한 판매 독려 안내입니다.',
        author_id: profile.id,
        show_as_popup: true,
        is_pinned: form.urgency === 'high',
      } as any)
      .select()
      .single();

    if (nErr) {
      toast({ title: '공지 등록 실패', description: nErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // 2) stock_urgent_alerts 레코드 생성
    const { error } = await supabase.from('stock_urgent_alerts').insert({
      product_name: form.product_name,
      stock_qty: form.stock_qty ? parseInt(form.stock_qty) : null,
      expiry_date: form.expiry_date || null,
      urgency: form.urgency,
      sales_channel: form.sales_channel || null,
      incentive_note: form.incentive_note || null,
      message: form.message || null,
      created_by: profile.id,
      notice_id: notice.id,
    } as any);

    if (error) {
      toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
      // 롤백
      await supabase.from('notices').delete().eq('id', notice.id);
    } else {
      await notifyAllUsers(
        profile.id,
        '📦 재고임박 판매 독려',
        `${profile.name_kr}님이 "${form.product_name}" 판매 독려 공지를 등록했습니다.`,
        'stock_alert',
        notice.id,
      );
      toast({ title: '판매독려 공지 등록 완료', description: '전 직원에게 팝업과 알림이 전송됩니다.' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const handleResolve = async (a: Alert) => {
    const { error } = await supabase
      .from('stock_urgent_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() } as any)
      .eq('id', a.id);
    if (error) {
      toast({ title: '처리 실패', description: error.message, variant: 'destructive' });
      return;
    }
    // 연동 공지의 팝업 해제
    if (a.notice_id) {
      await supabase.from('notices').update({ show_as_popup: false, is_pinned: false } as any).eq('id', a.notice_id);
    }
    toast({ title: '소진 완료 처리됨' });
    fetchData();
  };

  const handleDelete = async (a: Alert) => {
    const { error } = await supabase.from('stock_urgent_alerts').delete().eq('id', a.id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
      return;
    }
    if (a.notice_id) {
      await supabase.from('notices').delete().eq('id', a.notice_id);
    }
    toast({ title: '삭제 완료' });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const filtered = alerts.filter(a => a.status === tab);
  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageX className="h-6 w-6 text-destructive" />
            재고임박 판매독려
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            유통기한 임박·재고 소진 대상 상품의 판매 독려 공지를 관리합니다
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            <Dialog open={candidateDialogOpen} onOpenChange={setCandidateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />후보 자동 계산
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    재고/유통기한 기반 판매독려 후보
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <FileSpreadsheet className="h-3.5 w-3.5" />CSV 형식 안내
                    </div>
                    <div>열 순서: <b>상품명, 재고수량, 유통기한</b> (예: <code>곶감세트,12,2026-07-05</code>)</div>
                    <div>헤더 행이 있어도 자동 인식됩니다. 날짜는 YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD 모두 가능.</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs">CSV 업로드</Label>
                      <label className="flex items-center justify-center gap-2 h-9 px-3 border rounded-md cursor-pointer text-xs hover:bg-muted">
                        <Upload className="h-3.5 w-3.5" />파일 선택
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); }} />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">유통기한 임박 기준 (일 이내)</Label>
                      <Input type="number" min={1} value={thresholdDays} onChange={e => setThresholdDays(Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">재고 부족 기준 (개 이하)</Label>
                      <Input type="number" min={0} value={thresholdQty} onChange={e => setThresholdQty(Number(e.target.value) || 0)} />
                    </div>
                  </div>

                  {csvRows.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      업로드 {csvRows.length}건 중 <b className="text-foreground">{candidates.length}건</b>이 임계치에 해당합니다.
                    </div>
                  )}

                  <div className="max-h-[360px] overflow-y-auto space-y-2 -mx-1 px-1">
                    {candidates.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground border rounded-md">
                        {csvRows.length === 0 ? 'CSV 업로드 후 후보가 표시됩니다.' : '임계치에 해당하는 후보가 없습니다.'}
                      </div>
                    ) : candidates.map((c, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${urgencyMeta[c.urgency].cls} text-[10px] h-5`}>{urgencyMeta[c.urgency].label}</Badge>
                            <span className="font-medium truncate">{c.product_name}</span>
                            {c.dDay !== null && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                {c.dDay < 0 ? `D+${-c.dDay}` : c.dDay === 0 ? 'D-DAY' : `D-${c.dDay}`}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.stock_qty != null && <>재고 {c.stock_qty}개</>} {c.expiry_date && <>· 유통기한 {c.expiry_date}</>}
                          </div>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => pickCandidate(c)}>공지 등록</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />독려 공지 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  재고임박 판매독려 공지
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label>상품명 *</Label>
                  <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="예: 곶감 선물세트" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>잔여 수량</Label>
                    <Input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} placeholder="개" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>소진 목표일</Label>
                    <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>긴급도</Label>
                    <Select value={form.urgency} onValueChange={(v: any) => setForm(f => ({ ...f, urgency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">긴급 (즉시 판매)</SelectItem>
                        <SelectItem value="medium">주의</SelectItem>
                        <SelectItem value="low">관찰</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>판매 채널</Label>
                    <Input value={form.sales_channel} onChange={e => setForm(f => ({ ...f, sales_channel: e.target.value }))} placeholder="자사몰/네이버/쿠팡 등" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>인센티브/할인 안내</Label>
                  <Input value={form.incentive_note} onChange={e => setForm(f => ({ ...f, incentive_note: e.target.value }))} placeholder="예: 판매 1건당 인센티브, 30% 할인 적용" />
                </div>
                <div className="space-y-1.5">
                  <Label>독려 메시지</Label>
                  <Textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="팀원들에게 전달할 판매 독려 메시지" />
                </div>
                <div className="rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                  <Megaphone className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  등록 시 전 직원에게 <b className="text-foreground mx-1">팝업 공지 + 알림</b>이 자동 전송됩니다.
                </div>
                <Button onClick={handleSubmit} disabled={submitting || !form.product_name} className="w-full">
                  {submitting ? '등록 중...' : '등록하고 전체 공지'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {!canManage && (
        <Card>
          <CardContent className="p-3 text-xs text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            등록 권한은 담당자(조정선 주임) 및 경영진(대표·이사·실장)에게 부여되어 있습니다.
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="active">진행중 {activeCount > 0 && <Badge variant="destructive" className="ml-2 h-5">{activeCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="resolved">완료</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            {tab === 'active' ? '진행 중인 재고임박 알림이 없습니다' : '완료된 알림이 없습니다'}
          </CardContent></Card>
        )}
        {filtered.map(a => {
          const author = getProfile(a.created_by);
          const meta = urgencyMeta[a.urgency];
          let dDay: string | null = null;
          if (a.expiry_date) {
            try {
              const d = differenceInDays(parseISO(a.expiry_date), new Date());
              dDay = d < 0 ? `D+${-d}` : d === 0 ? 'D-DAY' : `D-${d}`;
            } catch {}
          }
          return (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${meta.cls} text-[10px] h-5`}>{meta.label}</Badge>
                      <h3 className="font-semibold">{a.product_name}</h3>
                      {dDay && <Badge variant="outline" className="text-[10px] h-5">{dDay}</Badge>}
                      {a.status === 'resolved' && <Badge variant="secondary" className="text-[10px] h-5">완료</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {a.stock_qty != null && <span>재고 {a.stock_qty}개</span>}
                      {a.expiry_date && <span>· 목표일 {a.expiry_date}</span>}
                      {a.sales_channel && <span>· {a.sales_channel}</span>}
                    </div>
                    {a.incentive_note && (
                      <p className="text-xs"><span className="text-muted-foreground">인센티브:</span> {a.incentive_note}</p>
                    )}
                    {a.message && (
                      <p className="text-sm whitespace-pre-wrap pt-1">{a.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {author && (
                      <>
                        <Avatar className="h-5 w-5 bg-primary"><AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{author.avatar}</AvatarFallback></Avatar>
                        <span>{author.name_kr}</span>
                        <span>·</span>
                      </>
                    )}
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(a.created_at), 'yyyy.MM.dd HH:mm')}</span>
                  </div>
                  {(canManage || profile?.id === a.created_by) && (
                    <div className="flex gap-1">
                      {a.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => handleResolve(a)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />소진 완료
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
