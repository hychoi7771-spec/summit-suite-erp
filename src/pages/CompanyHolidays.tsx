import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarOff, Plus, Pencil, Trash2 } from 'lucide-react';
import { loadCompanyHolidays } from '@/lib/holidays';

interface CompanyHoliday {
  id: string;
  date: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

const COLOR_OPTIONS = [
  { value: 'orange', label: '주황 (워크샵)', cls: 'bg-orange-500' },
  { value: 'red', label: '빨강 (창립기념)', cls: 'bg-red-500' },
  { value: 'blue', label: '파랑 (단체행사)', cls: 'bg-blue-500' },
  { value: 'green', label: '초록 (기타 휴무)', cls: 'bg-emerald-500' },
  { value: 'gray', label: '회색', cls: 'bg-gray-500' },
];

export default function CompanyHolidays() {
  const { profile, isManager } = useAuth();
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyHoliday | null>(null);

  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('orange');

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_holidays')
      .select('*')
      .order('date', { ascending: true });
    if (error) {
      toast({ title: '불러오기 실패', description: error.message, variant: 'destructive' });
    } else {
      setHolidays(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHolidays(); }, []);

  const resetForm = () => {
    setDate('');
    setName('');
    setDescription('');
    setColor('orange');
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (h: CompanyHoliday) => {
    setEditing(h);
    setDate(h.date);
    setName(h.name);
    setDescription(h.description || '');
    setColor(h.color || 'orange');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!date || !name.trim()) {
      toast({ title: '날짜와 휴무명을 입력하세요', variant: 'destructive' });
      return;
    }
    if (!profile?.id) return;

    if (editing) {
      const { error } = await supabase
        .from('company_holidays')
        .update({ date, name: name.trim(), description: description.trim() || null, color })
        .eq('id', editing.id);
      if (error) {
        toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: '수정되었습니다' });
    } else {
      const { error } = await supabase
        .from('company_holidays')
        .insert({ date, name: name.trim(), description: description.trim() || null, color, created_by: profile.id });
      if (error) {
        toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: '등록되었습니다' });
    }

    setDialogOpen(false);
    resetForm();
    await fetchHolidays();
    await loadCompanyHolidays(true); // 캐시 무효화
  };

  const handleDelete = async (h: CompanyHoliday) => {
    if (!confirm(`"${h.name}" 휴무를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('company_holidays').delete().eq('id', h.id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '삭제되었습니다' });
    await fetchHolidays();
    await loadCompanyHolidays(true);
  };

  const colorClass = (c: string | null) => COLOR_OPTIONS.find(o => o.value === c)?.cls || 'bg-gray-400';

  const upcoming = holidays.filter(h => new Date(h.date) >= new Date(new Date().toDateString()));
  const past = holidays.filter(h => new Date(h.date) < new Date(new Date().toDateString()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarOff className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">사내 휴무일 관리</h1>
            <p className="text-sm text-muted-foreground">워크샵, 창립기념일 등 회사 자체 휴무일을 등록합니다.</p>
          </div>
        </div>
        {isManager && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> 휴무일 등록
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? '사내 휴무일 수정' : '사내 휴무일 등록'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ch-date">날짜</Label>
                  <Input id="ch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-name">휴무명</Label>
                  <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 창립기념일, 워크샵 1일차" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-desc">설명 (선택)</Label>
                  <Textarea id="ch-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>색상</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          <div className="flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-full ${o.cls}`} />
                            {o.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                <Button onClick={handleSave}>{editing ? '수정' : '등록'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isManager && (
        <Card className="bg-muted/30">
          <CardContent className="py-4 text-sm text-muted-foreground">
            사내 휴무일은 <strong className="text-foreground">대표이사 / 총괄이사 / 차장</strong>만 등록·수정할 수 있습니다.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">예정된 휴무일 ({upcoming.length})</CardTitle>
          <CardDescription>오늘 이후 등록된 사내 휴무일입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">예정된 휴무일이 없습니다.</p>
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map(h => (
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-3 w-3 rounded-full shrink-0 ${colorClass(h.color)}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">{h.date}</span>
                        <span className="font-medium truncate">{h.name}</span>
                      </div>
                      {h.description && <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>}
                    </div>
                  </div>
                  {isManager && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(h)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">지난 휴무일 ({past.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {past.slice().reverse().map(h => (
                <div key={h.id} className="flex items-center justify-between py-2.5 opacity-70">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colorClass(h.color)}`} />
                    <span className="font-mono text-xs text-muted-foreground">{h.date}</span>
                    <span className="text-sm truncate">{h.name}</span>
                  </div>
                  {isManager && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(h)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
