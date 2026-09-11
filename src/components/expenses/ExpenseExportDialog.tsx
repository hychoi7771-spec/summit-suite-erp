import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { key: 'Pending', label: '대기' },
  { key: 'Approved', label: '승인' },
  { key: 'Reimbursed', label: '정산 완료' },
  { key: 'Rejected', label: '반려' },
];
const STATUS_LABEL: Record<string, string> = {
  Pending: '대기', Approved: '승인', Reimbursed: '정산 완료', Rejected: '반려',
};

const PAYMENT_LABEL: Record<string, string> = {
  personal: '개인지출', personal_card: '개인카드', corporate_card: '법인카드',
  corporate: '법인계좌', card: '카드결제', other: '기타',
};
const PAYMENTS = ['personal', 'personal_card', 'corporate_card', 'corporate', 'card', 'other'];

const COLUMNS = ['일자', '적요(내역)', '계정분류', '결제수단', '청구자', '공급가액', '부가세', '합계금액', '증빙', '상태'] as const;
const WIDTHS = [12, 44, 12, 12, 12, 14, 12, 14, 8, 10];

interface Props {
  expenses: any[];
  profiles: any[];
}

const todayISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

export default function ExpenseExportDialog({ expenses, profiles }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => {
    const t = todayISO();
    return `${t.slice(0, 7)}-01`;
  });
  const [to, setTo] = useState(todayISO);
  const [statuses, setStatuses] = useState<string[]>(['Pending', 'Approved', 'Reimbursed', 'Rejected']);
  const [payments, setPayments] = useState<string[]>(PAYMENTS);
  const [vatMode, setVatMode] = useState<'included' | 'none'>('included');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const getName = (id: string) => profiles.find(p => p.id === id)?.name_kr ?? '';

  const filtered = useMemo(() => {
    return expenses
      .filter(e => (!from || e.date >= from) && (!to || e.date <= to))
      .filter(e => statuses.length === 0 || statuses.includes(e.status))
      .filter(e => payments.length === 0 || payments.includes(e.payment_method || 'personal'))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [expenses, from, to, statuses, payments]);

  const total = filtered.reduce((a, b) => a + (b.amount || 0), 0);

  const toggle = (arr: string[], set: (v: string[]) => void, key: string) =>
    set(arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key]);

  const buildRows = () =>
    filtered.map(e => {
      const amount = e.amount || 0;
      const supply = vatMode === 'included' ? Math.round(amount / 1.1) : amount;
      const vat = vatMode === 'included' ? amount - supply : 0;
      return [
        e.date,
        e.description || '',
        e.category || '',
        PAYMENT_LABEL[e.payment_method || 'personal'] || e.payment_method,
        getName(e.submitted_by),
        supply,
        vat,
        amount,
        e.receipt_url ? '있음' : '없음',
        STATUS_LABEL[e.status] || e.status,
      ];
    });

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ title: '내보낼 내역이 없습니다', description: '기간 또는 조건을 조정해 주세요.', variant: 'destructive' });
      return;
    }
    const rows = buildRows();
    const supplyTotal = rows.reduce((a, r) => a + (r[5] as number), 0);
    const vatTotal = rows.reduce((a, r) => a + (r[6] as number), 0);
    const footer = ['합계', '', '', '', '', supplyTotal, vatTotal, total, '', `${filtered.length}건`];
    const fileBase = `지출내역_세무제출_${from || '전체'}_${to || '전체'}`;

    if (format === 'csv') {
      const csv = [COLUMNS, ...rows, footer]
        .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileBase}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const header = [
        ['지출 경비 내역서 (세무 제출용)'],
        [`대상 기간: ${from || '전체'} ~ ${to || '전체'}`],
        [`합계 금액: ${total.toLocaleString('ko-KR')}원 / 총 ${filtered.length}건`],
        [`부가세 처리: ${vatMode === 'included' ? '금액에 부가세 포함 (공급가액/부가세 분리 계산)' : '부가세 미분리'}`],
        [`작성일: ${todayISO()}`],
        [],
      ];
      const ws = XLSX.utils.aoa_to_sheet([...header, COLUMNS as unknown as string[], ...rows, footer]);
      ws['!cols'] = WIDTHS.map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '지출내역');
      XLSX.writeFile(wb, `${fileBase}.xlsx`);
    }

    toast({ title: '다운로드 완료', description: `${filtered.length}건을 내보냈습니다.` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
          <FileSpreadsheet className="h-4 w-4" />
          세무 제출용 다운로드
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>지출 내역 전자문서 다운로드</DialogTitle>
          <DialogDescription>세무사에게 전달할 지출 내역서를 엑셀 또는 CSV로 저장합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">시작일</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">종료일</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs">상태</Label>
            <div className="flex flex-wrap gap-3">
              {STATUSES.map(s => (
                <label key={s.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={statuses.includes(s.key)} onCheckedChange={() => toggle(statuses, setStatuses, s.key)} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">결제수단</Label>
            <div className="flex flex-wrap gap-3">
              {PAYMENTS.map(p => (
                <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={payments.includes(p)} onCheckedChange={() => toggle(payments, setPayments, p)} />
                  {PAYMENT_LABEL[p]}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">부가세 처리</Label>
              <Select value={vatMode} onValueChange={v => setVatMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">부가세 포함 금액 (분리 계산)</SelectItem>
                  <SelectItem value="none">부가세 미분리</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">파일 형식</Label>
              <Select value={format} onValueChange={v => setFormat(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">엑셀 (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            선택된 내역 <span className="font-semibold">{filtered.length}건</span> · 합계{' '}
            <span className="font-semibold">₩{total.toLocaleString('ko-KR')}</span>
          </div>

          <Button onClick={handleExport} className="w-full gap-2">
            <Download className="h-4 w-4" /> 다운로드
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
