import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Clock, Calendar as CalIcon, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  RoutineTemplate, RoutineFrequency, RoutineTimeOfDay,
  FREQUENCY_LABELS, TIME_OF_DAY_LABELS, WEEKDAY_LABELS, isRoutineForDate, fetchWeeklyRoutineStats,
} from '@/lib/routines';

const CATEGORIES = ['관리', '디자인', '기획', 'R&D', '인허가', '생산', '물류', '마케팅', '영업', '기타'];

interface FormState {
  id: string | null;
  user_id: string;
  title: string;
  description: string;
  frequency: RoutineFrequency;
  weekdays: number[];
  month_day: number;
  estimated_minutes: number;
  time_of_day: RoutineTimeOfDay;
  category: string;
  is_active: boolean;
}

const emptyForm = (userId: string): FormState => ({
  id: null,
  user_id: userId,
  title: '',
  description: '',
  frequency: 'daily',
  weekdays: [1, 2, 3, 4, 5],
  month_day: 1,
  estimated_minutes: 15,
  time_of_day: 'morning',
  category: '관리',
  is_active: true,
});

export default function Routines() {
  const { profile, isManager } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats state
  const [statsTemplates, setStatsTemplates] = useState<RoutineTemplate[]>([]);
  const [statsCompletions, setStatsCompletions] = useState<any[]>([]);

  const userId = selectedUserId || profile?.id || '';

  const fetchData = async () => {
    setLoading(true);
    const [tplRes, profRes] = await Promise.all([
      supabase.from('routine_templates').select('*').order('sort_order', { ascending: true }),
      supabase.from('profiles').select('id, name_kr, name, avatar').order('name_kr'),
    ]);
    setTemplates((tplRes.data as RoutineTemplate[]) || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  const fetchStats = async () => {
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const { templates: t, completions: c } = await fetchWeeklyRoutineStats(start, end);
    setStatsTemplates(t);
    setStatsCompletions(c);
  };

  useEffect(() => {
    fetchData();
    fetchStats();
    if (profile && !selectedUserId) setSelectedUserId(profile.id);
  }, [profile]);

  const myTemplates = templates.filter(t => t.user_id === userId);
  const isOwnView = userId === profile?.id;

  const openCreate = () => {
    if (!profile) return;
    setForm(emptyForm(userId));
    setDialogOpen(true);
  };

  const openEdit = (tpl: RoutineTemplate) => {
    setForm({
      id: tpl.id,
      user_id: tpl.user_id,
      title: tpl.title,
      description: tpl.description || '',
      frequency: tpl.frequency,
      weekdays: tpl.weekdays || [1, 2, 3, 4, 5],
      month_day: tpl.month_day || 1,
      estimated_minutes: tpl.estimated_minutes || 0,
      time_of_day: tpl.time_of_day,
      category: tpl.category || '관리',
      is_active: tpl.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form || !form.title.trim()) {
      toast({ title: '제목을 입력하세요', variant: 'destructive' });
      return;
    }

    const payload = {
      user_id: form.user_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      frequency: form.frequency,
      weekdays: form.frequency === 'weekly' ? form.weekdays : null,
      month_day: form.frequency === 'monthly' ? form.month_day : null,
      estimated_minutes: form.estimated_minutes,
      time_of_day: form.time_of_day,
      category: form.category,
      is_active: form.is_active,
      sort_order: myTemplates.length,
    };

    const { error } = form.id
      ? await supabase.from('routine_templates').update(payload).eq('id', form.id)
      : await supabase.from('routine_templates').insert(payload);

    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: form.id ? '루틴이 수정되었습니다' : '루틴이 추가되었습니다' });
    setDialogOpen(false);
    setForm(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 루틴을 삭제하시겠습니까? 과거 완료 기록도 함께 삭제됩니다.')) return;
    const { error } = await supabase.from('routine_templates').delete().eq('id', id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '삭제되었습니다' });
    fetchData();
  };

  const toggleActive = async (tpl: RoutineTemplate) => {
    await supabase.from('routine_templates').update({ is_active: !tpl.is_active }).eq('id', tpl.id);
    fetchData();
  };

  // Weekly stats per user
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const userStats = profiles.map(p => {
    const userTpls = statsTemplates.filter(t => t.user_id === p.id);
    let scheduled = 0;
    let done = 0;
    weekDays.forEach(d => {
      userTpls.forEach(tpl => {
        if (isRoutineForDate(tpl, d)) {
          scheduled++;
          const dateStr = format(d, 'yyyy-MM-dd');
          const comp = statsCompletions.find(c => c.template_id === tpl.id && c.date === dateStr);
          if (comp?.status === 'done') done++;
        }
      });
    });
    return {
      profile: p,
      scheduled,
      done,
      rate: scheduled > 0 ? Math.round((done / scheduled) * 100) : 0,
    };
  }).filter(s => s.scheduled > 0).sort((a, b) => b.rate - a.rate);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔁 루틴 업무 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">반복되는 일상 업무를 미리 등록하면 체크인 시 자동으로 채워집니다.</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates"><CalIcon className="h-4 w-4 mr-1" /> 루틴 템플릿</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" /> 주간 달성률</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {isManager && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">대상 직원:</Label>
                <Select value={userId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name_kr} {p.id === profile?.id ? '(나)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={openCreate} className="ml-auto">
              <Plus className="h-4 w-4 mr-1" /> 루틴 추가
            </Button>
          </div>

          {loading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">로딩 중...</CardContent></Card>
          ) : myTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  등록된 루틴이 없습니다.<br />
                  매일 반복하는 업무(예: "디자인 시안 검수", "재고 점검")를 등록해보세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {myTemplates.map(tpl => (
                <Card key={tpl.id} className={!tpl.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm">{tpl.title}</h3>
                          <Badge variant="secondary" className="text-[10px]">{TIME_OF_DAY_LABELS[tpl.time_of_day]}</Badge>
                          <Badge variant="outline" className="text-[10px]">{FREQUENCY_LABELS[tpl.frequency]}</Badge>
                          {tpl.frequency === 'weekly' && tpl.weekdays && (
                            <span className="text-[10px] text-muted-foreground">
                              {tpl.weekdays.map(d => WEEKDAY_LABELS[d]).join(', ')}
                            </span>
                          )}
                          {tpl.frequency === 'monthly' && (
                            <span className="text-[10px] text-muted-foreground">매월 {tpl.month_day}일</span>
                          )}
                          {tpl.estimated_minutes > 0 && (
                            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {tpl.estimated_minutes}분
                            </span>
                          )}
                          {tpl.category && <Badge variant="outline" className="text-[10px]">{tpl.category}</Badge>}
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{tpl.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={tpl.is_active} onCheckedChange={() => toggleActive(tpl)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tpl)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(tpl.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">이번 주 루틴 달성률 ({format(weekDays[0], 'M/d')} ~ {format(weekDays[6], 'M/d')})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">등록된 루틴이 없습니다.</p>
              ) : userStats.map(s => (
                <div key={s.profile.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{s.profile.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{s.profile.name_kr}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{s.done} / {s.scheduled}</span>
                      <Badge variant={s.rate >= 80 ? 'default' : s.rate >= 50 ? 'secondary' : 'destructive'}>
                        {s.rate}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={s.rate} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? '루틴 수정' : '새 루틴 추가'}</DialogTitle>
            <DialogDescription>반복되는 업무를 등록하면 체크인 시 자동으로 표시됩니다.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">제목 *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 디자인 시안 컨펌 확인"
                />
              </div>
              <div>
                <Label className="text-xs">설명 (선택)</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="구체적인 작업 절차, 체크 포인트 등"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">반복 주기</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v as RoutineFrequency })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">매주 (요일 지정)</SelectItem>
                      <SelectItem value="monthly">매월 (날짜 지정)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">시간대</Label>
                  <Select value={form.time_of_day} onValueChange={v => setForm({ ...form, time_of_day: v as RoutineTimeOfDay })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIME_OF_DAY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.frequency === 'weekly' && (
                <div>
                  <Label className="text-xs">요일 선택</Label>
                  <div className="flex gap-1 mt-1">
                    {WEEKDAY_LABELS.map((label, i) => {
                      const active = form.weekdays.includes(i);
                      return (
                        <Button
                          key={i}
                          type="button"
                          variant={active ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => {
                            const next = active ? form.weekdays.filter(d => d !== i) : [...form.weekdays, i].sort();
                            setForm({ ...form, weekdays: next });
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.frequency === 'monthly' && (
                <div>
                  <Label className="text-xs">매월 며칠</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.month_day}
                    onChange={e => setForm({ ...form, month_day: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                    className="h-9"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">예상 소요시간 (분)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.estimated_minutes}
                    onChange={e => setForm({ ...form, estimated_minutes: parseInt(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">카테고리</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="text-sm">활성화</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
