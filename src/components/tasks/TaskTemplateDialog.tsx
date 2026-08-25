import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Repeat, Plus, Trash2, Pencil, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  RECURRENCE_LABEL, WEEKDAY_LABELS, buildTaskRow,
  type Recurrence, type TaskTemplate,
} from '@/lib/taskTemplates';

interface Props {
  profiles: any[];
  categories: any[];
  onSuccess?: () => void;
}

const emptyForm = {
  name: '',
  title: '',
  description: '',
  priority: 'medium',
  category_id: '',
  assignee_id: '',
  project_name: '',
  recurrence: 'none' as Recurrence,
  weekdays: [] as number[],
  month_day: 1,
  due_offset_days: 0,
  is_active: true,
};

export default function TaskTemplateDialog({ profiles, categories, onSuccess }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('task_templates' as any)
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates((data as unknown as TaskTemplate[]) || []);
  };

  useEffect(() => { if (open) fetchTemplates(); }, [open]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const save = async () => {
    if (!form.name.trim() || !form.title.trim()) {
      toast({ title: '템플릿 이름과 업무 제목을 입력하세요', variant: 'destructive' });
      return;
    }
    if (form.recurrence === 'weekly' && form.weekdays.length === 0) {
      toast({ title: '반복할 요일을 선택하세요', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      category_id: form.category_id || null,
      assignee_id: form.assignee_id || profile?.id || null,
      project_name: form.project_name || null,
      recurrence: form.recurrence,
      weekdays: form.recurrence === 'weekly' ? form.weekdays : [],
      month_day: form.recurrence === 'monthly' ? form.month_day : null,
      due_offset_days: Number(form.due_offset_days) || 0,
      is_active: form.is_active,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('task_templates' as any).update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('task_templates' as any).insert({ ...payload, created_by: profile?.id }));
    }
    setSaving(false);
    if (error) { toast({ title: '저장 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editingId ? '템플릿이 수정되었습니다' : '템플릿이 저장되었습니다' });
    resetForm();
    fetchTemplates();
  };

  const startEdit = (t: TaskTemplate) => {
    setEditingId(t.id);
    setShowForm(true);
    setForm({
      name: t.name,
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'medium',
      category_id: t.category_id || '',
      assignee_id: t.assignee_id || '',
      project_name: t.project_name || '',
      recurrence: t.recurrence,
      weekdays: t.weekdays || [],
      month_day: t.month_day || 1,
      due_offset_days: t.due_offset_days ?? 0,
      is_active: t.is_active,
    });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('task_templates' as any).delete().eq('id', id);
    if (error) { toast({ title: '삭제 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '템플릿이 삭제되었습니다' });
    fetchTemplates();
  };

  const toggleActive = async (t: TaskTemplate) => {
    await supabase.from('task_templates' as any).update({ is_active: !t.is_active }).eq('id', t.id);
    fetchTemplates();
  };

  const generateNow = async (t: TaskTemplate) => {
    const { error } = await supabase.from('tasks').insert(buildTaskRow(t, profile?.id) as any);
    if (error) { toast({ title: '업무 생성 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '업무가 생성되었습니다', description: t.title });
    onSuccess?.();
  };

  const recurrenceText = (t: TaskTemplate) => {
    if (t.recurrence === 'weekly') return `매주 ${(t.weekdays || []).map(d => WEEKDAY_LABELS[d]).join('·')}`;
    if (t.recurrence === 'monthly') return `매월 ${t.month_day}일`;
    if (t.recurrence === 'daily') return '매일';
    return '수동';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
          <Repeat className="h-4 w-4" />템플릿 · 반복
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
          <DialogTitle>업무 템플릿 · 반복 업무</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            자주 등록하는 업무를 템플릿으로 저장하고, 매일·매주·매월 자동 생성되도록 설정할 수 있습니다.
            반복 템플릿은 접속 시 해당 날짜에 맞춰 자동으로 업무가 등록됩니다.
          </p>

          {!showForm && (
            <Button size="sm" className="gap-1.5" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}>
              <Plus className="h-3.5 w-3.5" />새 템플릿
            </Button>
          )}

          {showForm && (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>템플릿 이름 *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 주간보고 작성" />
                </div>
                <div className="space-y-1.5">
                  <Label>업무 제목 *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 주간 업무보고 제출" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>업무 내용</Label>
                <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>우선순위</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>카테고리</Label>
                  <Select value={form.category_id || 'none'} onValueChange={v => setForm(f => ({ ...f, category_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="선택 없음" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 없음</SelectItem>
                      {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>담당자</Label>
                  <Select value={form.assignee_id || profile?.id || ''} onValueChange={v => setForm(f => ({ ...f, assignee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="담당자" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name_kr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>프로젝트명</Label>
                  <Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>반복 주기</Label>
                  <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v as Recurrence }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map(k => (
                        <SelectItem key={k} value={k}>{RECURRENCE_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>마감 기한 (생성일 +일)</Label>
                  <Input type="number" min={0} value={form.due_offset_days}
                    onChange={e => setForm(f => ({ ...f, due_offset_days: Number(e.target.value) }))} />
                </div>
              </div>

              {form.recurrence === 'weekly' && (
                <div className="space-y-1.5">
                  <Label>반복 요일</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAY_LABELS.map((label, idx) => {
                      const on = form.weekdays.includes(idx);
                      return (
                        <Button key={idx} type="button" size="sm" variant={on ? 'default' : 'outline'}
                          className="w-9 px-0"
                          onClick={() => setForm(f => ({
                            ...f,
                            weekdays: on ? f.weekdays.filter(d => d !== idx) : [...f.weekdays, idx].sort(),
                          }))}>
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.recurrence === 'monthly' && (
                <div className="space-y-1.5">
                  <Label>매월 며칠</Label>
                  <Input type="number" min={1} max={31} value={form.month_day}
                    onChange={e => setForm(f => ({ ...f, month_day: Number(e.target.value) }))} />
                </div>
              )}

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">자동 생성 사용</p>
                  <p className="text-xs text-muted-foreground">끄면 수동 생성만 가능합니다.</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>취소</Button>
                <Button size="sm" onClick={save} disabled={saving}>{editingId ? '수정' : '저장'}</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">저장된 템플릿이 없습니다.</p>
            )}
            {templates.map(t => (
              <div key={t.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    <Badge variant="secondary" className="text-[11px]">{recurrenceText(t)}</Badge>
                    {!t.is_active && <Badge variant="outline" className="text-[11px]">중지</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{t.title}</p>
                  {t.last_generated_date && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">최근 생성: {t.last_generated_date}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="gap-1 h-8 px-2" onClick={() => generateNow(t)}>
                    <Zap className="h-3.5 w-3.5" />생성
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(t)}>
                    <Repeat className={`h-3.5 w-3.5 ${t.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
