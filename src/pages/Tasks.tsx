import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, FileText, Palette, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight, FolderKanban, GanttChartSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import DesignRequestDialog from '@/components/tasks/DesignRequestDialog';
import DesignRequestDetail from '@/components/tasks/DesignRequestDetail';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import GanttChart from '@/components/tasks/GanttChart';
import { notifyAdmins, notifyUser } from '@/lib/notifications';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

const columnsConfig: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: '할 일' },
  { status: 'in-progress', label: '진행 중' },
  { status: 'review', label: '검토' },
  { status: 'done', label: '완료' },
];

export default function Tasks() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const [activeTab, setActiveTab] = useState('board');
  const [taskList, setTaskList] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assignee_id: profile?.id || '', start_date: '', due_date: '', project_name: '' });
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedDesignTask, setSelectedDesignTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium', assignee_id: '', start_date: '', due_date: '', project_name: '' });

  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  useEffect(() => { fetchData(); }, []);

  // 본인 프로필 로드 시 폼 기본 담당자를 본인으로 설정
  useEffect(() => {
    if (profile?.id) {
      setTaskForm(f => f.assignee_id ? f : { ...f, assignee_id: profile.id });
    }
  }, [profile?.id]);

  // 다이얼로그 열릴 때 담당자가 비어있으면 본인으로 설정
  useEffect(() => {
    if (taskDialogOpen && profile?.id && !taskForm.assignee_id) {
      setTaskForm(f => ({ ...f, assignee_id: profile.id }));
    }
  }, [taskDialogOpen, profile?.id]);

  // Realtime: keep board in sync with check-in updates and other clients
  useEffect(() => {
    const channel = supabase
      .channel('tasks-page-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const [taskRes, profRes] = await Promise.all([
      supabase.from('tasks').select('*').order('position', { ascending: true }),
      supabase.from('profiles').select('id, name, name_kr, avatar'),
    ]);
    setTaskList(taskRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId as TaskStatus;
    setTaskList(prev => prev.map(task => task.id === draggableId ? { ...task, status: newStatus } : task));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId);
    if (error) { toast({ title: '상태 변경 실패', variant: 'destructive' }); fetchData(); }
  };

  const handleAddTask = async () => {
    if (!taskForm.title) return;
    const { error } = await supabase.from('tasks').insert({
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority as any,
      assignee_id: taskForm.assignee_id || profile?.id || null,
      start_date: taskForm.start_date || null,
      due_date: taskForm.due_date || null,
      project_name: taskForm.project_name || null,
      status: 'todo',
    });
    if (error) {
      toast({ title: '업무 등록 실패', description: error.message, variant: 'destructive' });
    } else {
      // Notify admins
      await notifyAdmins('새 업무 등록', `"${taskForm.title}" 업무가 등록되었습니다.`, 'task');
      // Notify assignee if assigned
      if (taskForm.assignee_id && taskForm.assignee_id !== profile?.id) {
        await notifyUser(taskForm.assignee_id, '업무 배정', `"${taskForm.title}" 업무가 배정되었습니다.`, 'task');
      }
      toast({ title: '업무 등록 완료' });
      setTaskDialogOpen(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assignee_id: profile?.id || '', start_date: '', due_date: '', project_name: '' });
      fetchData();
    }
  };

  const handleAddLog = async () => {
    if (!profile || !logForm.today_work) return;
    const { error } = await supabase.from('daily_logs').insert({
      user_id: profile.id,
      today_work: logForm.today_work,
      tomorrow_plan: logForm.tomorrow_plan,
      blockers: logForm.blockers || '특이사항 없음',
    });
    if (error) {
      toast({ title: '로그 작성 실패', description: error.message, variant: 'destructive' });
    } else {
      await notifyAdmins('데일리 로그 작성', `${profile.name_kr}님이 데일리 로그를 작성했습니다.`, 'daily_log');
      toast({ title: '데일리 로그 작성 완료' });
      setLogDialogOpen(false);
      setLogForm({ today_work: '', tomorrow_plan: '', blockers: '' });
      fetchData();
    }
  };

  const handleEditLog = async () => {
    if (!editingLog || !editLogForm.today_work) return;
    const { error } = await supabase.from('daily_logs').update({
      today_work: editLogForm.today_work,
      tomorrow_plan: editLogForm.tomorrow_plan,
      blockers: editLogForm.blockers || '특이사항 없음',
    }).eq('id', editingLog.id);
    if (error) {
      toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '로그 수정 완료' });
      setEditingLog(null);
      fetchData();
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('이 로그를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('daily_logs').delete().eq('id', logId);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '로그 삭제 완료' });
      fetchData();
    }
  };

  const canEditLog = (log: any) => {
    return profile && log.user_id === profile.id;
  };

  const openEditLog = (log: any) => {
    setEditingLog(log);
    setEditLogForm({
      today_work: log.today_work || '',
      tomorrow_plan: log.tomorrow_plan || '',
      blockers: log.blockers || '',
    });
  };

  const getDaysLeft = (dueDate: string | null) => {
    if (!dueDate) return null;
    return differenceInDays(startOfDay(parseISO(dueDate)), startOfDay(new Date()));
  };

  const canEditTask = (task: any) => {
    return isAdmin || (profile && task.assignee_id === profile.id);
  };

  const openEditDialog = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      assignee_id: task.assignee_id || '',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
      project_name: task.project_name || '',
    });
  };

  const handleEditTask = async () => {
    if (!editingTask || !editForm.title) return;
    const { error } = await supabase.from('tasks').update({
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority as any,
      assignee_id: editForm.assignee_id || null,
      start_date: editForm.start_date || null,
      due_date: editForm.due_date || null,
      project_name: editForm.project_name || null,
    }).eq('id', editingTask.id);
    if (error) {
      toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '업무 수정 완료' });
      setEditingTask(null);
      fetchData();
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 업무를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '업무 삭제 완료' });
      fetchData();
    }
  };

  const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
  const statusLabels: Record<string, string> = { todo: '할 일', 'in-progress': '진행 중', review: '검토', done: '완료' };

  const handleQuickStatusChange = async (taskId: string, currentStatus: TaskStatus, direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = statusOrder.indexOf(currentStatus);
    const newIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= statusOrder.length) return;
    const newStatus = statusOrder[newIdx];
    setTaskList(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) { toast({ title: '상태 변경 실패', variant: 'destructive' }); fetchData(); return; }
    if (profile) {
      await supabase.from('task_history').insert({ task_id: taskId, user_id: profile.id, field_name: 'status', old_value: currentStatus, new_value: newStatus });
    }
    toast({ title: `${statusLabels[currentStatus]} → ${statusLabels[newStatus]}` });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">업무 관리 & 데일리 스크럼</h1>
          <p className="text-sm text-muted-foreground mt-1">업무 및 일일 작업 로그 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <DesignRequestDialog profiles={profiles} onSuccess={fetchData} />
          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="h-4 w-4" />새 업무 등록</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>새 업무 등록</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>프로젝트 (선택)</Label>
                  {[...new Set(taskList.map(t => t.project_name).filter(Boolean))].length > 0 && (
                    <Select
                      value={taskForm.project_name || '__none__'}
                      onValueChange={v => setTaskForm(f => ({ ...f, project_name: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="기존 프로젝트에서 선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">미지정</SelectItem>
                        {[...new Set(taskList.map(t => t.project_name).filter(Boolean))].map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    placeholder="또는 새 프로젝트명 직접 입력"
                    value={taskForm.project_name}
                    onChange={e => setTaskForm(f => ({ ...f, project_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2"><Label>업무 제목</Label><Input placeholder="업무 제목" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>설명</Label><Textarea placeholder="업무 설명" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>우선순위</Label>
                  <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem><SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem><SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>담당자</Label>
                  <Select value={taskForm.assignee_id} onValueChange={v => setTaskForm(f => ({ ...f, assignee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>시작일</Label><Input type="date" value={taskForm.start_date} onChange={e => setTaskForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>마감일</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                </div>
                <Button onClick={handleAddTask} disabled={!taskForm.title} className="w-full">등록</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="board">칸반 보드</TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5"><GanttChartSquare className="h-3.5 w-3.5" />간트차트</TabsTrigger>
          <TabsTrigger value="daily">데일리 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4 space-y-4">
          {/* Status Summary Dashboard */}
          {(() => {
            const filtered = taskList.filter(t => {
              if (selectedProject !== 'all') {
                if (selectedProject === '__none__') { if (t.project_name) return false; }
                else if (t.project_name !== selectedProject) return false;
              }
              if (selectedAssignee !== 'all') {
                if (selectedAssignee === '__unassigned__') { if (t.assignee_id) return false; }
                else if (t.assignee_id !== selectedAssignee) return false;
              }
              return true;
            });
            const total = filtered.length;
            const counts: Record<string, number> = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
            filtered.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
            const urgentCount = filtered.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
            const overdueCount = filtered.filter(t => {
              const d = getDaysLeft(t.due_date);
              return d !== null && d < 0 && t.status !== 'done';
            }).length;
            const donePercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-4 lg:col-span-2 bg-card border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">전체 진행률</span>
                    <span className="text-lg font-bold text-primary">{donePercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500" style={{ width: `${donePercent}%` }} />
                  </div>
                  <div className="flex items-center gap-3 mt-2.5">
                    {[
                      { key: 'todo', label: '대기', color: 'bg-slate-400' },
                      { key: 'in-progress', label: '진행', color: 'bg-blue-500' },
                      { key: 'review', label: '검토', color: 'bg-amber-500' },
                      { key: 'done', label: '완료', color: 'bg-emerald-500' },
                    ].map(s => (
                      <div key={s.key} className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${s.color}`} />
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                        <span className="text-[10px] font-bold text-foreground">{counts[s.key]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {urgentCount > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">긴급/높음</span>
                    </div>
                    <span className="text-2xl font-bold text-destructive mt-1">{urgentCount}</span>
                  </div>
                )}
                {overdueCount > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">기한 초과</span>
                    </div>
                    <span className="text-2xl font-bold text-destructive mt-1">{overdueCount}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Project filter */}
          {(() => {
            const projectNames = [...new Set(taskList.map(t => t.project_name).filter(Boolean))] as string[];
            const hasUnassigned = taskList.some(t => !t.project_name);
            return projectNames.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                <button
                  onClick={() => setSelectedProject('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedProject === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                >
                  전체 ({taskList.length})
                </button>
                {projectNames.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedProject(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedProject === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                  >
                    {p} ({taskList.filter(t => t.project_name === p).length})
                  </button>
                ))}
                {hasUnassigned && (
                  <button
                    onClick={() => setSelectedProject('__none__')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedProject === '__none__' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                  >
                    미지정 ({taskList.filter(t => !t.project_name).length})
                  </button>
                )}
              </div>
            ) : null;
          })()}

          {/* Assignee filter */}
          {(() => {
            const assigneeIds = [...new Set(taskList.map(t => t.assignee_id).filter(Boolean))] as string[];
            const hasUnassigned = taskList.some(t => !t.assignee_id);
            return assigneeIds.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Avatar className="h-4 w-4 shrink-0">
                  <AvatarFallback className="text-[8px] bg-muted">All</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => setSelectedAssignee('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedAssignee === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                >
                  전체 담당자
                </button>
                {assigneeIds.map(id => {
                  const p = profiles.find(prof => prof.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedAssignee(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedAssignee === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px]" style={{ backgroundColor: p?.avatar ? 'transparent' : undefined }}>{p?.name_kr?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      {p?.name_kr || 'Unknown'}
                    </button>
                  );
                })}
                {hasUnassigned && (
                  <button
                    onClick={() => setSelectedAssignee('__unassigned__')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedAssignee === '__unassigned__' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}
                  >
                    미배정 ({taskList.filter(t => !t.assignee_id).length})
                  </button>
                )}
              </div>
            ) : null;
          })()}

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {columnsConfig.map(col => {
                  const columnColors: Record<string, { header: string; dot: string; dropzone: string }> = {
                    'todo': { header: 'bg-slate-100 dark:bg-slate-800/50', dot: 'bg-slate-400', dropzone: 'bg-slate-50/50 dark:bg-slate-900/20' },
                    'in-progress': { header: 'bg-blue-50 dark:bg-blue-900/20', dot: 'bg-blue-500', dropzone: 'bg-blue-50/30 dark:bg-blue-900/10' },
                    'review': { header: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500', dropzone: 'bg-amber-50/30 dark:bg-amber-900/10' },
                    'done': { header: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500', dropzone: 'bg-emerald-50/30 dark:bg-emerald-900/10' },
                  };
                  const colors = columnColors[col.status];
                  const filteredTasks = taskList.filter(t => {
                    if (selectedProject !== 'all') {
                      if (selectedProject === '__none__') { if (t.project_name) return false; }
                      else if (t.project_name !== selectedProject) return false;
                    }
                    if (selectedAssignee !== 'all') {
                      if (selectedAssignee === '__unassigned__') { if (t.assignee_id) return false; }
                      else if (t.assignee_id !== selectedAssignee) return false;
                    }
                    return true;
                  });
                  const colTasks = filteredTasks.filter(t => t.status === col.status);
                  return (
                    <div key={col.status} className="w-[280px] shrink-0">
                      <div className={`flex items-center justify-between mb-2 px-3 py-2 rounded-lg ${colors.header}`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                          <h3 className="text-sm font-bold">{col.label}</h3>
                        </div>
                        <span className="text-xs font-bold bg-background/80 text-foreground px-2 py-0.5 rounded-full shadow-sm">{colTasks.length}</span>
                      </div>
                      <Droppable droppableId={col.status}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className={`space-y-2 min-h-[120px] rounded-lg p-1.5 border border-dashed transition-colors ${snapshot.isDraggingOver ? 'border-primary/40 bg-primary/5' : `border-transparent ${colors.dropzone}`}`}>
                            {colTasks.map((task, index) => {
                              const assignee = getProfile(task.assignee_id);
                              const isDesign = task.is_design_request;
                              const daysLeft = getDaysLeft(task.due_date);
                              const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done';
                              return (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                      <Card
                                        className={`group transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20 rotate-1' : 'hover:shadow-md hover:-translate-y-0.5'} ${isDesign ? 'border-l-2 border-l-primary' : ''} ${isOverdue ? 'border-l-2 border-l-destructive' : ''}`}
                                        onClick={() => isDesign ? setSelectedDesignTask(task) : setSelectedTask(task)}
                                      >
                                        <CardContent className="p-3 space-y-2">
                                          <div className="flex items-start justify-between gap-1">
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                              {task.priority === 'urgent' && <span className="text-xs shrink-0">🔴</span>}
                                              {task.priority === 'high' && <span className="text-xs shrink-0">🟠</span>}
                                              {isDesign && <Palette className="h-3.5 w-3.5 text-primary shrink-0" />}
                                              <p className="text-sm font-medium leading-snug truncate">{task.title}</p>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                              {canEditTask(task) && (
                                                <>
                                                  <button onClick={(e) => openEditDialog(task, e)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                                    <Pencil className="h-3 w-3" />
                                                  </button>
                                                  <button onClick={(e) => handleDeleteTask(task.id, e)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          {task.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>}
                                          <div className="flex flex-wrap gap-1">
                                            {task.project_name && selectedProject === 'all' && (
                                              <Badge variant="outline" className="text-[10px] gap-0.5 bg-muted/50"><FolderKanban className="h-2.5 w-2.5" /> {task.project_name}</Badge>
                                            )}
                                            {isDesign && <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary"><Palette className="h-2.5 w-2.5" /> 디자인</Badge>}
                                            {task.meeting_id && <Badge variant="outline" className="text-[10px] gap-0.5"><FileText className="h-2.5 w-2.5" /> 회의록</Badge>}
                                            {(task.tags || []).slice(0, 2).map((tag: string) => (
                                              <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
                                            ))}
                                          </div>
                                          <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                            {assignee ? (
                                              <div className="flex items-center gap-1.5">
                                                <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/80 text-primary-foreground text-[9px]">{assignee.avatar}</AvatarFallback></Avatar>
                                                <span className="text-[11px] text-muted-foreground">{assignee.name_kr}</span>
                                              </div>
                                            ) : <span />}
                                            <div className="flex items-center gap-1">
                                              {statusOrder.indexOf(task.status) > 0 && (
                                                <button
                                                  onClick={(e) => handleQuickStatusChange(task.id, task.status, 'prev', e)}
                                                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                  title={statusLabels[statusOrder[statusOrder.indexOf(task.status) - 1]]}
                                                >
                                                  <ChevronLeft className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                              {statusOrder.indexOf(task.status) < statusOrder.length - 1 && (
                                                <button
                                                  onClick={(e) => handleQuickStatusChange(task.id, task.status, 'next', e)}
                                                  className={`p-0.5 rounded transition-colors ${
                                                    statusOrder.indexOf(task.status) === statusOrder.length - 2
                                                      ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 hover:text-emerald-700'
                                                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                  }`}
                                                  title={statusLabels[statusOrder[statusOrder.indexOf(task.status) + 1]]}
                                                >
                                                  <ChevronRight className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                              {daysLeft !== null && (
                                                <Badge variant={daysLeft < 0 ? 'destructive' : daysLeft <= 3 ? 'destructive' : daysLeft <= 7 ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                                                  <Calendar className="h-2.5 w-2.5 mr-0.5" />
                                                  {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {colTasks.length === 0 && (
                              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/60">
                                업무 없음
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <GanttChart
            tasks={taskList}
            profiles={profiles}
            selectedProject={selectedProject}
            onTaskClick={(task) => task.is_design_request ? setSelectedDesignTask(task) : setSelectedTask(task)}
          />
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          {dailyLogs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                <DialogTrigger asChild>
                  <Card className="border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center w-full max-w-md min-h-[240px] cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all group">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Plus className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-base font-medium text-foreground mb-1">오늘의 로그 작성</p>
                    <p className="text-sm text-muted-foreground">완료한 업무, 예정된 업무, 이슈를 기록하세요</p>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader><DialogTitle>📝 데일리 로그 작성</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />완료한 업무</Label>
                      <Textarea placeholder="• 전자결재 기능 구현 완료&#10;• 공지게시판 UI 수정" rows={4} value={logForm.today_work} onChange={e => setLogForm(f => ({ ...f, today_work: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-blue-500" />예정된 업무</Label>
                      <Textarea placeholder="• 파일 첨부 기능 연동 진행 예정&#10;• 알림 시스템 구축 검토" rows={4} value={logForm.tomorrow_plan} onChange={e => setLogForm(f => ({ ...f, tomorrow_plan: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" />이슈 및 요청사항</Label>
                      <Textarea placeholder="특이사항이 없으면 비워두세요" rows={3} value={logForm.blockers} onChange={e => setLogForm(f => ({ ...f, blockers: e.target.value }))} />
                    </div>
                    <Button onClick={handleAddLog} disabled={!logForm.today_work} className="w-full">작성 완료</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  <button
                    onClick={() => setLogView('list')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${logView === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    목록
                  </button>
                  <button
                    onClick={() => setLogView('calendar')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${logView === 'calendar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    캘린더
                  </button>
                </div>
                <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="h-4 w-4" />로그 작성</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>📝 데일리 로그 작성</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />완료한 업무</Label>
                        <Textarea placeholder="• 전자결재 기능 구현 완료&#10;• 공지게시판 UI 수정" rows={4} value={logForm.today_work} onChange={e => setLogForm(f => ({ ...f, today_work: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-blue-500" />예정된 업무</Label>
                        <Textarea placeholder="• 파일 첨부 기능 연동 진행 예정&#10;• 알림 시스템 구축 검토" rows={4} value={logForm.tomorrow_plan} onChange={e => setLogForm(f => ({ ...f, tomorrow_plan: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" />이슈 및 요청사항</Label>
                        <Textarea placeholder="특이사항이 없으면 비워두세요" rows={3} value={logForm.blockers} onChange={e => setLogForm(f => ({ ...f, blockers: e.target.value }))} />
                      </div>
                      <Button onClick={handleAddLog} disabled={!logForm.today_work} className="w-full">작성 완료</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {logView === 'calendar' ? (
                <DailyLogCalendarView
                  dailyLogs={dailyLogs}
                  profiles={profiles}
                  profileId={profile?.id || null}
                  canEditLog={canEditLog}
                  onEditLog={openEditLog}
                  onDeleteLog={handleDeleteLog}
                />
              ) : (

              <div className="space-y-2">
                {dailyLogs.map(log => {
                  const user = getProfile(log.user_id);
                  const isOwner = canEditLog(log);
                  // Preview: first line of today_work
                  const preview = (log.today_work || '').split('\n')[0].slice(0, 60);
                  return (
                    <Collapsible key={log.id}>
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">{user?.avatar || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{user?.name_kr || '알 수 없음'}</span>
                                <span className="text-xs text-muted-foreground">{log.date}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{preview || '내용 없음'}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isOwner && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); openEditLog(log); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 p-3">
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />완료한 업무
                              </p>
                              <p className="text-sm whitespace-pre-line leading-relaxed">{log.today_work}</p>
                            </div>
                            {log.tomorrow_plan && (
                              <div className="rounded-md bg-blue-500/5 border border-blue-500/10 p-3">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1.5">
                                  <ClipboardList className="h-3.5 w-3.5" />예정된 업무
                                </p>
                                <p className="text-sm whitespace-pre-line leading-relaxed">{log.tomorrow_plan}</p>
                              </div>
                            )}
                            {log.blockers && log.blockers !== '특이사항 없음' && (
                              <div className="rounded-md bg-amber-500/5 border border-amber-500/10 p-3">
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5" />이슈 및 요청사항
                                </p>
                              <p className="text-sm whitespace-pre-line leading-relaxed">{log.blockers}</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Design request detail modal */}
      {selectedDesignTask && (
        <DesignRequestDetail
          task={selectedDesignTask}
          assignee={getProfile(selectedDesignTask.assignee_id)}
          open={!!selectedDesignTask}
          onOpenChange={(open) => !open && setSelectedDesignTask(null)}
        />
      )}

      {/* Task detail modal with comments, links, history */}
      <TaskDetailDialog
        task={selectedTask}
        profiles={profiles}
        allTasks={taskList}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdate={fetchData}
      />

      {/* Edit task dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>업무 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>프로젝트 (선택)</Label>
              {[...new Set(taskList.map(t => t.project_name).filter(Boolean))].length > 0 && (
                <Select
                  value={editForm.project_name || '__none__'}
                  onValueChange={v => setEditForm(f => ({ ...f, project_name: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="기존 프로젝트에서 선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">미지정</SelectItem>
                    {[...new Set(taskList.map(t => t.project_name).filter(Boolean))].map(p => (
                      <SelectItem key={p as string} value={p as string}>{p as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                placeholder="또는 새 프로젝트명 직접 입력"
                value={editForm.project_name}
                onChange={e => setEditForm(f => ({ ...f, project_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2"><Label>업무 제목</Label><Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>설명</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>우선순위</Label>
              <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">낮음</SelectItem><SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="high">높음</SelectItem><SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>담당자</Label>
              <Select value={editForm.assignee_id} onValueChange={v => setEditForm(f => ({ ...f, assignee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>시작일</Label><Input type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>마감일</Label><Input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <Button onClick={handleEditTask} disabled={!editForm.title} className="w-full">수정 완료</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit log dialog */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>📝 데일리 로그 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />완료한 업무</Label>
              <Textarea rows={4} value={editLogForm.today_work} onChange={e => setEditLogForm(f => ({ ...f, today_work: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-blue-500" />예정된 업무</Label>
              <Textarea rows={4} value={editLogForm.tomorrow_plan} onChange={e => setEditLogForm(f => ({ ...f, tomorrow_plan: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" />이슈 및 요청사항</Label>
              <Textarea rows={3} value={editLogForm.blockers} onChange={e => setEditLogForm(f => ({ ...f, blockers: e.target.value }))} />
            </div>
            <Button onClick={handleEditLog} disabled={!editLogForm.today_work} className="w-full">수정 완료</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
