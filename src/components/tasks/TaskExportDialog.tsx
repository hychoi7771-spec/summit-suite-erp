import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const PRIORITIES = [
  { key: 'urgent', label: '긴급' },
  { key: 'high', label: '높음' },
  { key: 'medium', label: '보통' },
  { key: 'low', label: '낮음' },
];
const PRIORITY_LABEL: Record<string, string> = { low: '낮음', medium: '보통', high: '높음', urgent: '긴급' };

const ALL_COLUMNS = ['제목', '상태', '카테고리', '프로젝트', '담당자', '우선순위', '시작일', '마감일', '태그', '내용', '등록일', '최종수정'] as const;
type ColumnKey = typeof ALL_COLUMNS[number];
const COL_WIDTH: Record<ColumnKey, number> = {
  '제목': 34, '상태': 10, '카테고리': 14, '프로젝트': 16, '담당자': 10, '우선순위': 9,
  '시작일': 12, '마감일': 12, '태그': 18, '내용': 60, '등록일': 12, '최종수정': 12,
};

interface Props {
  tasks: any[];
  profiles: any[];
  categories: TaskCategory[];
}

export default function TaskExportDialog({ tasks, profiles, categories }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState<StatusKey[]>(STATUSES.map(s => s.key));
  const [priorities, setPriorities] = useState<string[]>(PRIORITIES.map(p => p.key));
  const [assignees, setAssignees] = useState<string[]>([]); // 빈 배열 = 전체
  const [categoryIds, setCategoryIds] = useState<string[]>([]); // 빈 배열 = 전체
  const [projectName, setProjectName] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [dateField, setDateField] = useState<'created_at' | 'due_date' | 'start_date' | 'updated_at'>('created_at');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [noAssignee, setNoAssignee] = useState(false);
  const [noDueDate, setNoDueDate] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'title'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [splitBy, setSplitBy] = useState<'status' | 'assignee' | 'category' | 'none'>('status');
  const [columns, setColumns] = useState<ColumnKey[]>([...ALL_COLUMNS]);

  const today = new Date().toISOString().slice(0, 10);

  const projectNames = useMemo(
    () => Array.from(new Set(tasks.map(t => t.project_name).filter(Boolean))).sort() as string[],
    [tasks]
  );

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(a => a !== v) : [...arr, v]);

  const nameOf = (id: string | null) => profiles.find(p => p.id === id)?.name_kr || '';
  const catOf = (id: string | null) => categories.find(c => c.id === id)?.name || '';

  const matches = (t: any) => {
    if (!selected.includes(t.status)) return false;
    if (priorities.length && !priorities.includes(t.priority)) return false;
    if (assignees.length && !assignees.includes(t.assignee_id)) return false;
    if (categoryIds.length && !categoryIds.includes(t.category_id)) return false;
    if (projectName !== 'all' && (t.project_name || '') !== projectName) return false;
    if (noAssignee && t.assignee_id) return false;
    if (noDueDate && t.due_date) return false;
    if (overdueOnly && !(t.due_date && t.due_date < today && t.status !== 'done')) return false;
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      const hay = `${t.title || ''} ${t.description || ''} ${(t.tags || []).join(' ')} ${t.project_name || ''}`.toLowerCase();
      if (!hay.includes(k)) return false;
    }
    const d = (t[dateField] || '').slice(0, 10);
    if ((from || to) && !d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const rows = tasks.filter(matches);
    const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    rows.sort((a, b) => {
      let r = 0;
      if (sortBy === 'priority') r = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      else if (sortBy === 'title') r = String(a.title || '').localeCompare(String(b.title || ''));
      else r = String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''));
      return sortDir === 'asc' ? r : -r;
    });
    return rows;
  }, [tasks, selected, priorities, assignees, categoryIds, projectName, keyword, dateField, from, to, overdueOnly, noAssignee, noDueDate, sortBy, sortDir]);

  const toRow = (t: any) => {
    const full: Record<ColumnKey, any> = {
      '제목': t.title || '',
      '상태': STATUSES.find(s => s.key === t.status)?.label || t.status || '',
      '카테고리': catOf(t.category_id),
      '프로젝트': t.project_name || '',
      '담당자': nameOf(t.assignee_id) || '미지정',
      '우선순위': PRIORITY_LABEL[t.priority] || t.priority || '',
      '시작일': t.start_date || '',
      '마감일': t.due_date || '',
      '태그': Array.isArray(t.tags) ? t.tags.join(', ') : '',
      '내용': (t.description || '').replace(/\s+/g, ' ').trim(),
      '등록일': (t.created_at || '').slice(0, 10),
      '최종수정': (t.updated_at || '').slice(0, 10),
    };
    const out: Record<string, any> = {};
    ALL_COLUMNS.filter(c => columns.includes(c)).forEach(c => { out[c] = full[c]; });
    return out;
  };

  const sheetName = (raw: string, used: Set<string>) => {
    let n = (raw || '미지정').replace(/[\\/*?:[\]]/g, ' ').slice(0, 28) || '미지정';
    let i = 2;
    while (used.has(n)) n = `${n.slice(0, 26)}_${i++}`;
    used.add(n);
    return n;
  };

  const handleExport = () => {
    if (columns.length === 0) {
      toast({ title: '내보낼 항목을 1개 이상 선택하세요', variant: 'destructive' });
      return;
    }
    if (filtered.length === 0) {
      toast({ title: '조건에 맞는 업무가 없습니다', variant: 'destructive' });
      return;
    }

    const wb = XLSX.utils.book_new();
    const cols = ALL_COLUMNS.filter(c => columns.includes(c)).map(c => ({ wch: COL_WIDTH[c] }));

    // 요약 시트
    const summary = STATUSES.filter(s => selected.includes(s.key)).map(s => {
      const list = filtered.filter(t => t.status === s.key);
      const overdue = list.filter(t => t.due_date && t.status !== 'done' && t.due_date < today).length;
      return { '단계': s.label, '건수': list.length, '기한초과': overdue, '담당자수': new Set(list.map(t => t.assignee_id).filter(Boolean)).size };
    });
    summary.push({
      '단계': '합계',
      '건수': filtered.length,
      '기한초과': summary.reduce((a, b) => a + b['기한초과'], 0),
      '담당자수': new Set(filtered.map(t => t.assignee_id).filter(Boolean)).size,
    });
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약');

    const addSheet = (name: string, list: any[], used: Set<string>) => {
      const data = list.map(toRow);
      const ws = XLSX.utils.json_to_sheet(data.length ? data : [toRow({})]);
      ws['!cols'] = cols;
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: cols.length - 1 } }) };
      XLSX.utils.book_append_sheet(wb, ws, sheetName(name, used));
    };

    const used = new Set<string>(['요약']);
    if (splitBy === 'status') {
      STATUSES.filter(s => selected.includes(s.key)).forEach(s => addSheet(s.label, filtered.filter(t => t.status === s.key), used));
    } else if (splitBy === 'assignee') {
      const keys = Array.from(new Set(filtered.map(t => t.assignee_id)));
      keys.forEach(k => addSheet(nameOf(k) || '미지정', filtered.filter(t => t.assignee_id === k), used));
    } else if (splitBy === 'category') {
      const keys = Array.from(new Set(filtered.map(t => t.category_id)));
      keys.forEach(k => addSheet(catOf(k) || '미분류', filtered.filter(t => t.category_id === k), used));
    }
    addSheet('전체', filtered, used);

    XLSX.writeFile(wb, `업무리포트_${today}.xlsx`);
    toast({ title: `엑셀 다운로드 완료 (${filtered.length}건)` });
    setOpen(false);
  };

  const resetAll = () => {
    setSelected(STATUSES.map(s => s.key));
    setPriorities(PRIORITIES.map(p => p.key));
    setAssignees([]); setCategoryIds([]); setProjectName('all'); setKeyword('');
    setDateField('created_at'); setFrom(''); setTo('');
    setOverdueOnly(false); setNoAssignee(false); setNoDueDate(false);
    setSortBy('created_at'); setSortDir('desc'); setSplitBy('status'); setColumns([...ALL_COLUMNS]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
          <FileSpreadsheet className="h-4 w-4" />업무 리포트
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>업무 리포트 다운로드</DialogTitle>
          <DialogDescription>조건을 세분화해 원하는 업무만 엑셀로 받으세요.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            <div>
              <Label className="text-sm">단계</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {STATUSES.map(s => (
                  <label key={s.key} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer">
                    <Checkbox checked={selected.includes(s.key)} onCheckedChange={() => toggle(selected, s.key, setSelected)} />
                    <span>{s.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{tasks.filter(t => t.status === s.key).length}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">우선순위</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {PRIORITIES.map(p => (
                  <label key={p.key} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer">
                    <Checkbox checked={priorities.includes(p.key)} onCheckedChange={() => toggle(priorities, p.key, setPriorities)} />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">담당자 <span className="text-xs text-muted-foreground">(미선택 = 전체)</span></Label>
              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border p-2 grid grid-cols-3 gap-1.5">
                {profiles.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={assignees.includes(p.id)} onCheckedChange={() => toggle(assignees, p.id, setAssignees)} />
                    <span className="truncate">{p.name_kr}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">카테고리 <span className="text-xs text-muted-foreground">(미선택 = 전체)</span></Label>
              <div className="mt-2 max-h-28 overflow-y-auto rounded-md border p-2 grid grid-cols-3 gap-1.5">
                {categories.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={categoryIds.includes(c.id)} onCheckedChange={() => toggle(categoryIds, c.id, setCategoryIds)} />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">프로젝트</Label>
                <Select value={projectName} onValueChange={setProjectName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {projectNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">키워드 (제목·내용·태그)</Label>
                <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="검색어" />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">기간 기준</Label>
                <Select value={dateField} onValueChange={v => setDateField(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">등록일</SelectItem>
                    <SelectItem value="due_date">마감일</SelectItem>
                    <SelectItem value="start_date">시작일</SelectItem>
                    <SelectItem value="updated_at">최종수정일</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">시작</Label>
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">종료</Label>
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>기한초과만</span>
                <Switch checked={overdueOnly} onCheckedChange={setOverdueOnly} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>담당자 미지정</span>
                <Switch checked={noAssignee} onCheckedChange={setNoAssignee} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>마감일 없음</span>
                <Switch checked={noDueDate} onCheckedChange={setNoDueDate} />
              </label>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">정렬 기준</Label>
                <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">등록일</SelectItem>
                    <SelectItem value="due_date">마감일</SelectItem>
                    <SelectItem value="priority">우선순위</SelectItem>
                    <SelectItem value="title">제목</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">정렬 방향</Label>
                <Select value={sortDir} onValueChange={v => setSortDir(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">내림차순</SelectItem>
                    <SelectItem value="asc">오름차순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">시트 분리</Label>
                <Select value={splitBy} onValueChange={v => setSplitBy(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">단계별</SelectItem>
                    <SelectItem value="assignee">담당자별</SelectItem>
                    <SelectItem value="category">카테고리별</SelectItem>
                    <SelectItem value="none">분리 안 함</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm">포함할 항목(열)</Label>
              <div className="mt-2 rounded-md border p-2 grid grid-cols-4 gap-1.5">
                {ALL_COLUMNS.map(c => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={columns.includes(c)} onCheckedChange={() => toggle(columns, c, setColumns)} />
                    <span className="truncate">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-3 border-t space-y-2">
          <p className="text-sm text-muted-foreground">조건에 맞는 업무 <span className="font-semibold text-foreground">{filtered.length}</span>건</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAll} className="shrink-0">초기화</Button>
            <Button className="flex-1 gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />엑셀 다운로드
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
