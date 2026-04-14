import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Check, CheckCircle2, Stamp, Trash2, ChevronLeft, ChevronRight, Clock, CircleDot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import stampImage from '@/assets/stamp.png';

interface MorningTask {
  id: string;
  text: string;
  completed: boolean;
}

interface DailyReport {
  id: string;
  user_id: string;
  date: string;
  morning_tasks: MorningTask[];
  completion_checked: boolean;
  checked_at: string | null;
  director_approved: boolean;
  director_approved_by: string | null;
  director_approved_at: string | null;
  ceo_approved: boolean;
  ceo_approved_by: string | null;
  ceo_approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function DailyWorkReport() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTasks, setNewTasks] = useState<string[]>(['']);
  const [newNotes, setNewNotes] = useState('');

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const isDirector = userRole === 'general_director';
  const isCeo = userRole === 'ceo';

  const fetchData = async () => {
    const [reportsRes, profilesRes] = await Promise.all([
      supabase
        .from('daily_work_reports')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, user_id, name, name_kr, avatar'),
    ]);
    setReports((reportsRes.data as any[]) || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const myReport = reports.find(r => r.user_id === profile?.id);

  const handleCreateReport = async () => {
    if (!profile) return;
    const tasks: MorningTask[] = newTasks
      .filter(t => t.trim())
      .map((t, i) => ({ id: `task-${Date.now()}-${i}`, text: t.trim(), completed: false }));
    if (tasks.length === 0) {
      toast({ title: '업무를 하나 이상 입력해주세요', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('daily_work_reports').insert({
      user_id: profile.id,
      date: selectedDate,
      morning_tasks: tasks as any,
      notes: newNotes || null,
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: '이미 오늘 보고서가 등록되어 있습니다', variant: 'destructive' });
      } else {
        toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: '일일업무보고 등록 완료' });
    setDialogOpen(false);
    setNewTasks(['']);
    setNewNotes('');
    fetchData();
  };

  const handleToggleTask = async (report: DailyReport, taskId: string) => {
    if (report.user_id !== profile?.id) return;
    const updatedTasks = report.morning_tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const allCompleted = updatedTasks.every(t => t.completed);
    await supabase.from('daily_work_reports').update({
      morning_tasks: updatedTasks as any,
      completion_checked: allCompleted,
      checked_at: allCompleted ? new Date().toISOString() : null,
    }).eq('id', report.id);
    fetchData();
  };

  const handleDirectorApprove = async (reportId: string) => {
    if (!profile) return;
    await supabase.from('daily_work_reports').update({
      director_approved: true,
      director_approved_by: profile.id,
      director_approved_at: new Date().toISOString(),
    }).eq('id', reportId);
    toast({ title: '이사 확인 완료' });
    fetchData();
  };

  const handleCeoApprove = async (reportId: string) => {
    if (!profile) return;
    await supabase.from('daily_work_reports').update({
      ceo_approved: true,
      ceo_approved_by: profile.id,
      ceo_approved_at: new Date().toISOString(),
      ceo_stamp_url: '/stamp.png',
    }).eq('id', reportId);
    toast({ title: '대표 직인 승인 완료' });
    fetchData();
  };

  const handleDelete = async (reportId: string) => {
    await supabase.from('daily_work_reports').delete().eq('id', reportId);
    toast({ title: '보고서 삭제 완료' });
    fetchData();
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const getStatusBadge = (report: DailyReport) => {
    if (report.ceo_approved) return <Badge className="bg-success/10 text-success border-success/20">최종 승인</Badge>;
    if (report.director_approved) return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">이사 확인</Badge>;
    if (report.completion_checked) return <Badge className="bg-warning/10 text-warning border-warning/20">완료 체크</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">작성 중</Badge>;
  };

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">일일업무보고</h1>
          <p className="text-sm text-muted-foreground mt-1">오전 업무 등록 → 퇴근 전 완료 체크 → 이사 확인 → 대표 직인 승인</p>
        </div>
        {isToday && !myReport && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> 오늘 업무 등록</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>오늘의 업무 등록</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">금일 할 일</p>
                  {newTasks.map((task, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input
                        value={task}
                        onChange={e => {
                          const copy = [...newTasks];
                          copy[i] = e.target.value;
                          setNewTasks(copy);
                        }}
                        placeholder={`업무 ${i + 1}`}
                      />
                      {newTasks.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setNewTasks(newTasks.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setNewTasks([...newTasks, ''])}>
                    <Plus className="h-3 w-3 mr-1" /> 업무 추가
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">비고</p>
                  <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="참고 사항..." rows={2} />
                </div>
                <Button onClick={handleCreateReport} className="w-full">등록</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-lg font-semibold">{format(new Date(selectedDate), 'yyyy년 M월 d일 (EEE)', { locale: ko })}</p>
          {isToday && <Badge variant="outline" className="text-xs">오늘</Badge>}
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>
            오늘로
          </Button>
        )}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">이 날짜에 등록된 보고서가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const user = getProfile(report.user_id);
            const directorProfile = report.director_approved_by ? getProfile(report.director_approved_by) : null;
            const ceoProfile = report.ceo_approved_by ? getProfile(report.ceo_approved_by) : null;
            const isOwner = report.user_id === profile?.id;
            const allCompleted = report.morning_tasks.every(t => t.completed);

            return (
              <Card key={report.id} className="relative overflow-hidden">
                {report.ceo_approved && (
                  <div className="absolute top-3 right-3 opacity-30">
                    <img src={stampImage} alt="직인" className="h-16 w-16" />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.avatar || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{user?.name_kr || user?.name || '알 수 없음'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(report.created_at), 'HH:mm')} 등록</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(report)}
                      {isOwner && !report.director_approved && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(report.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Task list */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">금일 업무</p>
                    <div className="space-y-1.5">
                      {report.morning_tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded-md border ${task.completed ? 'bg-success/5 border-success/20' : 'border-border'} ${isOwner && !report.director_approved ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                          onClick={() => isOwner && !report.director_approved && handleToggleTask(report, task.id)}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          ) : (
                            <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {report.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">비고</p>
                      <p className="text-sm text-muted-foreground">{report.notes}</p>
                    </div>
                  )}

                  {/* Approval flow */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                    {/* Step 1: Completion check */}
                    <div className="flex items-center gap-1.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${allCompleted ? 'bg-success text-white' : 'bg-muted'}`}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-muted-foreground">완료 체크</span>
                    </div>

                    <ChevronRight className="h-3 w-3 text-muted-foreground" />

                    {/* Step 2: Director approval */}
                    <div className="flex items-center gap-1.5">
                      {report.director_approved ? (
                        <>
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            이사 확인 ({directorProfile?.name_kr})
                          </span>
                        </>
                      ) : (isDirector || isCeo) && allCompleted ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDirectorApprove(report.id)}>
                          <Check className="h-3 w-3 mr-1" /> 이사 확인
                        </Button>
                      ) : (
                        <>
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-xs text-muted-foreground">이사 확인 대기</span>
                        </>
                      )}
                    </div>

                    <ChevronRight className="h-3 w-3 text-muted-foreground" />

                    {/* Step 3: CEO stamp */}
                    <div className="flex items-center gap-1.5">
                      {report.ceo_approved ? (
                        <>
                          <div className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <Stamp className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            직인 승인 ({ceoProfile?.name_kr})
                          </span>
                        </>
                      ) : isCeo && report.director_approved ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleCeoApprove(report.id)}>
                          <Stamp className="h-3 w-3 mr-1" /> 직인 날인
                        </Button>
                      ) : (
                        <>
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <Stamp className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-xs text-muted-foreground">직인 승인 대기</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
