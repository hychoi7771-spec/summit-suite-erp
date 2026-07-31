import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TaskCategory } from '@/components/tasks/CategoryBar';

type StatusKey = 'todo' | 'in-progress' | 'review' | 'done' | 'scheduled';

const STATUSES: { key: StatusKey; label: string }[] = [
  { key: 'todo', label: '할 일' },
  { key: 'in-progress', label: '진행 중' },
  { key: 'review', label: '검토' },
  { key: 'done', label: '완료' },
  { key: 'scheduled', label: '예약' },
];

const PRIORITY_LABEL: Record<string, string> = { low: '낮음', medium: '보통', high: '높음', urgent: '긴급' };

interface Props {
  tasks: any[];
  profiles: any[];
  categories: TaskCategory[];
}

export default function TaskExportDialog({ tasks, profiles, categories }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<StatusKey[]>(STATUSES.map(s => s.key));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const toggle = (key: StatusKey) =>
    setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  const nameOf = (id: string | null) => profiles.find(p => p.id === id)?.name_kr || '';
  const catOf = (id: string | null) => categories.find(c => c.id === id)?.name || '';

  const inRange = (t: any) => {
    const d = (t.created_at || '').slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const toRow = (t: any) => ({
    '제목': t.title || '',
    '상태': STATUSES.find(s => s.key === t.status)?.label || t.status,
    '카테고리': catOf(t.category_id),
    '프로젝트': t.project_name || '',
    '담당자': nameOf(t.assignee_id),
    '우선순위': PRIORITY_LABEL[t.priority] || t.priority || '',
    '시작일': t.start_date || '',
    '마감일': t.due_date || '',
    '태그': Array.isArray(t.tags) ? t.tags.join(', ') : '',
    '내용': (t.description || '').replace(/\s+/g, ' ').trim(),
    '등록일': (t.created_at || '').slice(0, 10),
    '최종수정': (t.updated_at || '').slice(0, 10),
  });

  const handleExport = () => {
    const rows = tasks.filter(t => selected.includes(t.status) && inRange(t));
    if (rows.length === 0) {
      toast({ title: '내보낼 업무가 없습니다', variant: 'destructive' });
      return;
    }

    const wb = XLSX.utils.book_new();

    // 요약 시트
    const summary = STATUSES.filter(s => selected.includes(s.key)).map(s => {
      const list = rows.filter(t => t.status === s.key);
      const overdue = list.filter(t => t.due_date && t.status !== 'done' && t.due_date < new Date().toISOString().slice(0, 10)).length;
      return { '단계': s.label, '건수': list.length, '기한초과': overdue, '담당자수': new Set(list.map(t => t.assignee_id).filter(Boolean)).size };
    });
    summary.push({ '단계': '합계', '건수': rows.length, '기한초과': summary.reduce((a, b) => a + b['기한초과'], 0), '담당자수': new Set(rows.map(t => t.assignee_id).filter(Boolean)).size });
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약');

    // 단계별 시트
    const cols = [{ wch: 34 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 60 }, { wch: 12 }, { wch: 12 }];
    STATUSES.filter(s => selected.includes(s.key)).forEach(s => {
      const list = rows.filter(t => t.status === s.key).map(toRow);
      const ws = XLSX.utils.json_to_sheet(list.length ? list : [toRow({})]);
      ws['!cols'] = cols;
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(list.length, 1), c: cols.length - 1 } }) };
      XLSX.utils.book_append_sheet(wb, ws, s.label);
    });

    // 전체 시트
    const wsAll = XLSX.utils.json_to_sheet(rows.map(toRow));
    wsAll['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, wsAll, '전체');

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `업무리포트_${stamp}.xlsx`);
    toast({ title: `엑셀 다운로드 완료 (${rows.length}건)` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
          <FileSpreadsheet className="h-4 w-4" />업무 리포트
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>업무 리포트 다운로드</DialogTitle>
          <DialogDescription>단계별 시트로 나뉜 엑셀 파일을 받습니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">포함할 단계</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STATUSES.map(s => {
                const count = tasks.filter(t => t.status === s.key && inRange(t)).length;
                return (
                  <label key={s.key} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer">
                    <Checkbox checked={selected.includes(s.key)} onCheckedChange={() => toggle(s.key)} />
                    <span>{s.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">등록일 시작</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">등록일 종료</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <Button className="w-full gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />엑셀 다운로드
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
