import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, CheckCircle, DollarSign, Upload, Image, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';
import { notifyAdmins, notifyUser } from '@/lib/notifications';

const formatKRW = (n: number) => `₩${n.toLocaleString('ko-KR')}`;
const categories = Constants.public.Enums.expense_category;
type PaymentMethodValue = 'personal' | 'personal_card' | 'corporate_card' | 'corporate' | 'card' | 'other';
const PAYMENT_METHODS: { value: PaymentMethodValue; label: string }[] = [
  { value: 'personal', label: '개인지출 (정산)' },
  { value: 'personal_card', label: '개인카드 (정산)' },
  { value: 'corporate_card', label: '법인카드 (기록용)' },
  { value: 'corporate', label: '법인계좌 (기록용)' },
  { value: 'other', label: '기타' },
];
// 법인 결제수단: 회사가 이미 지불 → 등록 시 자동 Approved, 정산 단계 없음
const CORPORATE_METHODS: PaymentMethodValue[] = ['corporate_card', 'corporate'];
// 정산이 필요한 결제수단: 본인이 먼저 지불 → 승인 후 Reimbursed
const REIMBURSABLE_METHODS: PaymentMethodValue[] = ['personal', 'personal_card', 'card'];
const paymentMethodLabel = (v: string) => PAYMENT_METHODS.find(p => p.value === v)?.label ?? (v === 'card' ? '카드결제' : v);

export default function Expenses() {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [approvedApprovals, setApprovedApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [form, setForm] = useState({ amount: '', category: '' as string, description: '', payment_method: 'personal' as PaymentMethodValue });


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [expRes, profRes, apprRes] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('profiles').select('id, user_id, name, name_kr, avatar'),
      supabase
        .from('approvals')
        .select('id, title, type, subcategory, status, requester_id, approved_at, created_at, content')
        .eq('status', 'approved')
        .in('subcategory', ['purchase_request', 'contract_request', 'business_trip', 'event_proposal'])
        .order('approved_at', { ascending: false }),
    ]);
    setExpenses(expRes.data || []);
    setProfiles(profRes.data || []);
    setApprovedApprovals(apprRes.data || []);
    setLoading(false);
  };


  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const handleSubmit = async () => {
    if (!profile || !user) return;
    setSubmitting(true);

    let receiptUrl: string | null = null;

    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop();
      const path = `expenses/${user.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('receipts').upload(path, receiptFile);
      if (error) {
        toast({ title: '영수증 업로드 실패', description: error.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(data.path);
      receiptUrl = urlData.publicUrl;
    }

    const isCeo = userRole === 'ceo';
    // 대표 등록만 즉시 Approved (전결). 법인 결제수단도 대표 결재 필요.
    const autoApproved = isCeo;

    const { error } = await supabase.from('expenses').insert({
      amount: parseInt(form.amount),
      category: form.category as any,
      description: form.description,
      submitted_by: profile.id,
      receipt_url: receiptUrl,
      payment_method: form.payment_method as any,
      status: (autoApproved ? 'Approved' : 'Pending') as any,
    });

    if (error) {
      toast({ title: '경비 등록 실패', description: error.message, variant: 'destructive' });
    } else {
      if (isCeo) {
        toast({ title: '전결 완료', description: '대표 권한으로 즉시 승인되었습니다.' });
      } else {
        await notifyAdmins(
          '새 경비 청구',
          `${profile.name_kr}님이 ${formatKRW(parseInt(form.amount))} 경비를 청구했습니다. (${form.category} / ${paymentMethodLabel(form.payment_method)})`,
          'expense'
        );
        toast({ title: '경비 등록 완료', description: '대표 승인 대기 중입니다.' });
      }
      setDialogOpen(false);
      setForm({ amount: '', category: '', description: '', payment_method: 'personal' });
      setReceiptFile(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (expenseId: string, newStatus: string) => {
    const { error } = await supabase.from('expenses').update({ status: newStatus as any }).eq('id', expenseId);
    if (!error) {
      const expense = expenses.find(e => e.id === expenseId);
      if (expense) {
        const statusLabels: Record<string, string> = {
          Approved: '승인', Rejected: '반려', Reimbursed: '정산 완료',
        };
        await notifyUser(
          expense.submitted_by,
          `경비 ${statusLabels[newStatus] || newStatus}`,
          `${formatKRW(expense.amount)} (${expense.category}) 경비가 ${statusLabels[newStatus]}되었습니다.`,
          'expense',
          expenseId
        );
      }
      toast({ title: '상태 변경 완료' });
      fetchData();
    }
  };

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  const pendingTotal = expenses.filter(e => e.status === 'Pending').reduce((a, b) => a + b.amount, 0);
  const approvedTotal = expenses.filter(e => e.status === 'Approved').reduce((a, b) => a + b.amount, 0);
  const reimbursedTotal = expenses.filter(e => e.status === 'Reimbursed').reduce((a, b) => a + b.amount, 0);

  const summaryCards = [
    { label: '대기 중', value: formatKRW(pendingTotal), icon: Clock, count: expenses.filter(e => e.status === 'Pending').length },
    { label: '승인됨', value: formatKRW(approvedTotal), icon: CheckCircle, count: expenses.filter(e => e.status === 'Approved').length },
    { label: '정산 완료', value: formatKRW(reimbursedTotal), icon: DollarSign, count: expenses.filter(e => e.status === 'Reimbursed').length },
  ];

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Receipt}
        title="지출 통합 관리"
        description="경비 청구 및 승인된 구매·계약·출장·행사 품의 통합 현황"
        tone="amber"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                새 경비 청구
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 경비 청구</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>금액 (원)</Label>
                  <Input type="number" placeholder="250000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>분류</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="분류 선택" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>결제수단</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>내역</Label>
                <Textarea placeholder="경비 내역을 입력하세요" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>영수증</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input type="file" accept="image/*,.pdf" className="hidden" id="receipt-upload" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    {receiptFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Image className="h-4 w-4 text-success" />
                        <span>{receiptFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">클릭하여 영수증 업로드</span>
                        <span className="text-xs text-muted-foreground">이미지 또는 PDF</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !form.amount || !form.category} className="w-full">
                {submitting ? '등록 중...' : '경비 청구'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{card.label}</p>
                  <p className="text-xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.count}건 청구</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">전체 경비 청구 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>내역</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead>결제수단</TableHead>
                  <TableHead>청구자</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>영수증</TableHead>
                  <TableHead>상태</TableHead>
                  {isAdmin && <TableHead>액션</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => {
                  const submitter = getProfile(expense.submitted_by);
                  const isCeo = userRole === 'ceo';
                  return (
                    <TableRow
                      key={expense.id}
                      className={isCeo ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={isCeo ? () => setSelectedExpense(expense) : undefined}
                    >
                      <TableCell className="text-sm">{expense.date}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">{expense.description}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{expense.category}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          expense.payment_method === 'personal_card' || expense.payment_method === 'card' ? 'bg-info/10 text-info'
                          : expense.payment_method === 'corporate_card' ? 'bg-warning/10 text-warning'
                          : expense.payment_method === 'corporate' ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                          {paymentMethodLabel(expense.payment_method || 'personal')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {submitter && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 bg-primary">
                              <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{submitter.avatar}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{submitter.name_kr}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatKRW(expense.amount)}</TableCell>
                      <TableCell>
                        {expense.receipt_url ? (
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-info hover:underline flex items-center gap-1">
                            <Image className="h-3 w-3" /> 보기
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={expense.status} /></TableCell>
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {expense.status === 'Pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(expense.id, 'Approved')}>승인</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleStatusChange(expense.id, 'Rejected')}>반려</Button>
                            </div>
                          )}
                          {expense.status === 'Approved' && REIMBURSABLE_METHODS.includes(expense.payment_method as PaymentMethodValue) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(expense.id, 'Reimbursed')}>정산</Button>
                          )}
                          {expense.status === 'Approved' && CORPORATE_METHODS.includes(expense.payment_method as PaymentMethodValue) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleStatusChange(expense.id, 'Rejected')}>반려</Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">결재 승인 지출 품의 (구매·계약·출장·행사)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">전자결재로 승인 완료된 지출성 품의 — 실집행 시 별도 경비 등록이 필요할 수 있습니다.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>승인일</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>기안자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedApprovals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      승인된 지출성 품의가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {approvedApprovals.map(a => {
                  const requester = getProfile(a.requester_id);
                  const subLabel: Record<string, string> = {
                    purchase_request: '구매 품의',
                    contract_request: '계약 품의',
                    business_trip: '출장 품의',
                    event_proposal: '행사안 품의',
                  };
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{a.approved_at ? new Date(a.approved_at).toLocaleDateString('ko-KR') : '—'}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{subLabel[a.subcategory] || a.subcategory}</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[260px] truncate">{a.title}</TableCell>
                      <TableCell>
                        {requester && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 bg-primary">
                              <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{requester.avatar}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{requester.name_kr}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status="Approved" /></TableCell>
                      <TableCell>
                        <Link to={`/approvals?category=${a.subcategory}`} className="text-xs text-info hover:underline">결재함 열기</Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedExpense} onOpenChange={(o) => !o && setSelectedExpense(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>경비 청구 상세</DialogTitle>
          </DialogHeader>
          {selectedExpense && (() => {
            const submitter = getProfile(selectedExpense.submitted_by);
            const canApprove = userRole === 'ceo' || userRole === 'general_director';
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-muted-foreground">청구일</div>
                  <div className="col-span-2">{selectedExpense.date}</div>
                  <div className="text-muted-foreground">청구자</div>
                  <div className="col-span-2">{submitter?.name_kr ?? '—'}</div>
                  <div className="text-muted-foreground">분류</div>
                  <div className="col-span-2">{selectedExpense.category}</div>
                  <div className="text-muted-foreground">결제수단</div>
                  <div className="col-span-2">{paymentMethodLabel(selectedExpense.payment_method || 'personal')}</div>
                  <div className="text-muted-foreground">금액</div>
                  <div className="col-span-2 font-semibold">{formatKRW(selectedExpense.amount)}</div>
                  <div className="text-muted-foreground">상태</div>
                  <div className="col-span-2"><StatusBadge status={selectedExpense.status} /></div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">내역</div>
                  <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 min-h-[60px]">
                    {selectedExpense.description || '—'}
                  </div>
                </div>
                {selectedExpense.receipt_url && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">영수증</div>
                    <a href={selectedExpense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline inline-flex items-center gap-1">
                      <Image className="h-3 w-3" /> 새 창에서 열기
                    </a>
                    {/\.(png|jpe?g|gif|webp)$/i.test(selectedExpense.receipt_url) && (
                      <img src={selectedExpense.receipt_url} alt="영수증" className="mt-2 rounded-md border max-h-64 object-contain" />
                    )}
                  </div>
                )}
                {canApprove && selectedExpense.status === 'Pending' && (
                  <div className="flex gap-2 justify-end pt-3 border-t">
                    <Button variant="outline" className="text-destructive" onClick={async () => { await handleStatusChange(selectedExpense.id, 'Rejected'); setSelectedExpense(null); }}>반려</Button>
                    <Button onClick={async () => { await handleStatusChange(selectedExpense.id, 'Approved'); setSelectedExpense(null); }}>승인</Button>
                  </div>
                )}
                {canApprove && selectedExpense.status === 'Approved' && REIMBURSABLE_METHODS.includes(selectedExpense.payment_method as PaymentMethodValue) && (
                  <div className="flex justify-end pt-3 border-t">
                    <Button onClick={async () => { await handleStatusChange(selectedExpense.id, 'Reimbursed'); setSelectedExpense(null); }}>정산 완료</Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>

  );
}
