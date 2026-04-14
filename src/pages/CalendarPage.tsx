import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, ListTodo, Users, CalendarPlus, Trash2, CalendarDays, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'meeting' | 'custom';
  meta?: string;
  description?: string;
  createdBy?: string;
  createdById?: string;
  start_time?: string;
  end_time?: string;
}

export default function CalendarPage() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ title: '', description: '', date: '', start_time: '', end_time: '' });

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const [tasksRes, meetingsRes, customRes, profRes] = await Promise.all([
      supabase.from('tasks').select('id, title, due_date, priority').gte('due_date', start).lte('due_date', end),
      supabase.from('meetings').select('id, title, date, category').gte('date', start).lte('date', end),
      supabase.from('calendar_events').select('*').gte('date', start).lte('date', end),
      supabase.from('profiles').select('id, name_kr'),
    ]);

    setProfiles(profRes.data || []);
    const getProfileName = (id: string) => (profRes.data || []).find((p: any) => p.id === id)?.name_kr || '';

    const taskEvents: CalendarEvent[] = (tasksRes.data || []).map(t => ({
      id: t.id, title: t.title, date: t.due_date!, type: 'task' as const, meta: t.priority,
    }));
    const meetingEvents: CalendarEvent[] = (meetingsRes.data || []).map(m => ({
      id: m.id, title: m.title, date: m.date, type: 'meeting' as const, meta: m.category || '',
    }));
    const customEvents: CalendarEvent[] = (customRes.data || []).map(c => ({
      id: c.id, title: c.title, date: c.date, type: 'custom' as const,
      description: c.description || '', 
      meta: c.start_time ? `${c.start_time?.slice(0,5)}~${c.end_time?.slice(0,5) || ''}` : '',
      createdBy: getProfileName(c.created_by),
      createdById: c.created_by,
      start_time: c.start_time || '',
      end_time: c.end_time || '',
    }));

    setEvents([...taskEvents, ...meetingEvents, ...customEvents]);
    setLoading(false);
  };

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(e => isSameDay(new Date(e.date), selectedDate));
  }, [selectedDate, events]);

  const eventDates = useMemo(() => {
    const map = new Map<string, { tasks: number; meetings: number; custom: number }>();
    events.forEach(e => {
      const key = e.date;
      const existing = map.get(key) || { tasks: 0, meetings: 0, custom: 0 };
      if (e.type === 'task') existing.tasks++;
      else if (e.type === 'meeting') existing.meetings++;
      else existing.custom++;
      map.set(key, existing);
    });
    return map;
  }, [events]);

  const resetForm = () => {
    setForm({ title: '', description: '', date: '', start_time: '', end_time: '' });
    setEditingEvent(null);
  };

  const handleAddEvent = async () => {
    if (!form.title || !form.date || !profile) return;
    const { error } = await supabase.from('calendar_events').insert({
      title: form.title,
      description: form.description || null,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      created_by: profile.id,
    });
    if (error) {
      toast({ title: '일정 등록 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '일정이 등록되었습니다' });
      setDialogOpen(false);
      resetForm();
      fetchEvents();
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !form.title || !form.date) return;
    
    if (editingEvent.type === 'custom') {
      const { error } = await supabase.from('calendar_events').update({
        title: form.title, description: form.description || null, date: form.date,
        start_time: form.start_time || null, end_time: form.end_time || null,
      }).eq('id', editingEvent.id);
      if (error) { toast({ title: '수정 실패', description: error.message, variant: 'destructive' }); return; }
    } else if (editingEvent.type === 'task') {
      const { error } = await supabase.from('tasks').update({
        title: form.title, due_date: form.date,
      }).eq('id', editingEvent.id);
      if (error) { toast({ title: '수정 실패', description: error.message, variant: 'destructive' }); return; }
    } else if (editingEvent.type === 'meeting') {
      const { error } = await supabase.from('meetings').update({
        title: form.title, date: form.date,
      }).eq('id', editingEvent.id);
      if (error) { toast({ title: '수정 실패', description: error.message, variant: 'destructive' }); return; }
    }
    
    toast({ title: '일정이 수정되었습니다' });
    setDialogOpen(false);
    resetForm();
    fetchEvents();
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    const table = event.type === 'custom' ? 'calendar_events' : event.type === 'task' ? 'tasks' : 'meetings';
    const { error } = await supabase.from(table).delete().eq('id', event.id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '삭제되었습니다' });
      fetchEvents();
    }
  };

  const canEditEvent = (event: CalendarEvent) => {
    if (event.type === 'custom') return event.createdById === profile?.id || isAdmin;
    return isAdmin;
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
    });
    setDialogOpen(true);
  };

  const typeConfig: Record<string, { color: string; icon: any; label: string; dot: string }> = {
    task: { color: 'bg-info/10 text-info border-info/20', icon: ListTodo, label: '업무', dot: 'bg-info' },
    meeting: { color: 'bg-accent/10 text-accent border-accent/20', icon: Users, label: '회의', dot: 'bg-accent' },
    custom: { color: 'bg-primary/10 text-primary border-primary/20', icon: CalendarDays, label: '일정', dot: 'bg-primary' },
  };

  const openDialogForDate = () => {
    resetForm();
    setForm(f => ({ ...f, date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '' }));
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">캘린더</h1>
          <p className="text-sm text-muted-foreground mt-1">업무·회의·주요 일정을 한눈에 확인하고 등록</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={openDialogForDate}>
          <CalendarPlus className="h-4 w-4" />새 일정 등록
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { resetForm(); } setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEvent ? '일정 수정' : '새 일정 등록'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>일정 제목</Label>
              <Input placeholder="일정 제목" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Textarea placeholder="일정 설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>날짜</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            {(!editingEvent || editingEvent.type === 'custom') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>시작 시간 (선택)</Label>
                  <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>종료 시간 (선택)</Label>
                  <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
            )}
            <Button onClick={editingEvent ? handleUpdateEvent : handleAddEvent} disabled={!form.title || !form.date} className="w-full">
              {editingEvent ? '수정' : '등록'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>오늘</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ko}
              className="p-3 pointer-events-auto w-full"
              classNames={{
                months: "w-full", month: "w-full", table: "w-full",
                head_row: "flex w-full",
                head_cell: "flex-1 text-center text-muted-foreground text-xs font-medium",
                row: "flex w-full mt-1",
                cell: "flex-1 text-center relative p-0",
                day: cn("h-10 w-full rounded-md text-sm font-normal transition-colors", "hover:bg-muted focus:bg-muted"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                day_today: "font-bold text-primary",
              }}
              components={{
                DayContent: ({ date }) => {
                  const key = format(date, 'yyyy-MM-dd');
                  const counts = eventDates.get(key);
                  return (
                    <div className="flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {counts && (
                        <div className="flex gap-0.5 mt-0.5">
                          {counts.tasks > 0 && <span className="h-1.5 w-1.5 rounded-full bg-info" />}
                          {counts.meetings > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                          {counts.custom > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-info" /> 업무</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-accent" /> 회의</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> 일정</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, 'M월 d일 (EEEE)', { locale: ko }) : '날짜 선택'}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openDialogForDate}>
                <CalendarPlus className="h-3.5 w-3.5" />추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">이 날의 일정이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(event => {
                  const config = typeConfig[event.type];
                  const Icon = config.icon;
                  const editable = canEditEvent(event);
                  return (
                    <div key={`${event.type}-${event.id}`} className={cn("p-3 rounded-lg border", config.color)}>
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          {event.description && <p className="text-xs mt-0.5 opacity-70 line-clamp-2">{event.description}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                            {event.meta && <Badge variant="outline" className="text-[10px]">{event.meta}</Badge>}
                            {event.createdBy && <span className="text-[10px] text-muted-foreground">by {event.createdBy}</span>}
                          </div>
                        </div>
                        {editable && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => openEditDialog(event)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => handleDeleteEvent(event)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
