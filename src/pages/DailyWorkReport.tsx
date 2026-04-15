import { useState, useEffect, useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, isSameWeek, isSameMonth, isSameYear, getDay, getWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus, CheckCircle2, Trash2, ChevronLeft, ChevronRight,
  Clock, CircleDot, MessageSquare, AlertTriangle, Flag, Send, ChevronDown, ChevronUp,
  LogIn, LogOut, Users, LayoutList, Table2, CalendarDays, Calendar as CalendarIcon, BarChart3, Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EmojiReactionBar } from '@/components/daily/EmojiReactionBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

// --- Types ---
interface MorningTask {
  id: string;
  text: string;
  detail: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface DailyReport {
  id: string;
  user_id: string;
  date: string;
  morning_tasks: MorningTask[];
  completion_checked: boolean;
  checked_at: string | null;
  notes: string | null;
  created_at: string;
}

interface ReportComment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const CATEGORIES = [
  { value: '기획', label: '📋 기획' },
  { value: '디자인', label: '🎨 디자인' },
  { value: 'R&D', label: '🔬 R&D' },
  { value: '인허가', label: '📄 인허가' },
  { value: '생산', label: '🏭 생산' },
  { value: '물류', label: '📦 물류' },
  { value: '배송', label: '🚚 배송' },
  { value: '마케팅', label: '📢 마케팅' },
  { value: '영업', label: '💼 영업' },
  { value: '관리', label: '⚙️ 관리' },
  { value: '기타', label: '📌 기타' },
];

const PRIORITY_CONFIG = {
  high: { label: '긴급', bg: 'bg-destructive/10 border-destructive/20 text-destructive' },
  medium: { label: '보통', bg: 'bg-warning/10 border-warning/20 text-warning' },
  low: { label: '낮음', bg: 'bg-muted text-muted-foreground' },
};

const CATEGORY_COLORS: Record<string, string> = {
  '기획': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '디자인': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'R&D': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  '인허가': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '생산': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  '물류': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  '배송': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  '마케팅': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  '영업': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  '관리': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  '기타': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

// --- Sub-components ---

function TaskCreateForm({ tasks, setTasks }: { tasks: Omit<MorningTask, 'id' | 'completed'>[]; setTasks: (t: Omit<MorningTask, 'id' | 'completed'>[]) => void }) {
  const addTask = () => setTasks([...tasks, { text: '', detail: '', category: '기타', priority: 'medium' }]);
  const removeTask = (i: number) => setTasks(tasks.filter((_, j) => j !== i));
  const update = (i: number, patch: Partial<Omit<MorningTask, 'id' | 'completed'>>) => {
    const copy = [...tasks];
    copy[i] = { ...copy[i], ...patch };
    setTasks(copy);
  };

  return (
    <div className="space-y-4">
      {tasks.map((task, i) => (
        <div key={i} className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
            <Input value={task.text} onChange={e => update(i, { text: e.target.value })} placeholder="업무 제목" className="font-medium" />
            {tasks.length > 1 && (
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeTask(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">카테고리</Label>
              <Select value={task.category} onValueChange={v => update(i, { category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">우선순위</Label>
              <Select value={task.priority} onValueChange={v => update(i, { priority: v as 'high' | 'medium' | 'low' })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 긴급</SelectItem>
                  <SelectItem value="medium">🟡 보통</SelectItem>
                  <SelectItem value="low">🟢 낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">세부 내용</Label>
            <Textarea value={task.detail} onChange={e => update(i, { detail: e.target.value })} placeholder="구체적인 작업 내용, 목표, 참고사항 등" rows={2} className="text-sm" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addTask} className="w-full">
        <Plus className="h-3 w-3 mr-1" /> 업무 추가
      </Button>
    </div>
  );
}

function CommentsSection({ reportId, profiles, currentProfile, isAdmin }: {
  reportId: string; profiles: any[]; currentProfile: any; isAdmin: boolean;
}) {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();

  useEffect(() => { fetchComments(); }, [reportId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('daily_report_comments')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const handleAdd = async () => {
    if (!newComment.trim() || !currentProfile) return;
    const { error } = await supabase.from('daily_report_comments').insert({
      report_id: reportId,
      user_id: currentProfile.id,
      content: newComment.trim(),
    });
    if (error) {
      toast({ title: '코멘트 등록 실패', variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('daily_report_comments').delete().eq('id', id);
    fetchComments();
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <MessageSquare className="h-3.5 w-3.5" /> 코멘트 ({comments.length})
      </p>

      {comments.map(c => {
        const user = getProfile(c.user_id);
        const canDel = c.user_id === currentProfile?.id || isAdmin;
        return (
          <div key={c.id} className="bg-muted/50 border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{user?.avatar || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{user?.name_kr || '알 수 없음'}</span>
                <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'M/d HH:mm')}</span>
              </div>
              {canDel && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
            <p className="text-sm pl-7 whitespace-pre-line">{c.content}</p>
          </div>
        );
      })}

      {/* Comment input - available for ALL users */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{currentProfile?.avatar || '?'}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{currentProfile?.name_kr || ''}</span>
          </div>
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="코멘트를 입력하세요..."
            rows={2}
            className="text-sm"
          />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!newComment.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ReportCard({
  report, profile: currentProfile, profiles, isAdmin,
  onToggleTask, onDelete,
}: {
  report: DailyReport;
  profile: any;
  profiles: any[];
  isAdmin: boolean;
  onToggleTask: (report: DailyReport, taskId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const user = profiles.find(p => p.id === report.user_id);
  const isOwner = report.user_id === currentProfile?.id;
  const completedCount = report.morning_tasks.filter(t => t.completed).length;
  const totalCount = report.morning_tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCheckedOut = report.completion_checked;

  const categoryGroups = report.morning_tasks.reduce((acc, task) => {
    const cat = task.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, MorningTask[]>);

  const getStatusInfo = () => {
    if (isCheckedOut) return { label: '체크아웃 완료', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '🚪' };
    return { label: '체크인', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '☀️' };
  };

  const status = getStatusInfo();

  return (
    <Card className="relative overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{user?.avatar || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{user?.name_kr || '알 수 없음'}</span>
              <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                {status.icon} {status.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              <LogIn className="h-3 w-3 inline mr-0.5" />
              {format(new Date(report.created_at), 'HH:mm')} 체크인
              {report.checked_at && (
                <span className="ml-2">
                  <LogOut className="h-3 w-3 inline mr-0.5" />
                  {format(new Date(report.checked_at), 'HH:mm')} 체크아웃
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs font-medium text-muted-foreground">{completedCount}/{totalCount}</span>
            <div className="w-16">
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {(isOwner || isAdmin) && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(report.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Emoji reactions */}
      <div className="px-5 pb-2">
        <EmojiReactionBar reportId={report.id} profiles={profiles} />
      </div>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Tasks grouped by category */}
          {Object.entries(categoryGroups).map(([category, tasks]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS['기타']}`}>
                  {category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {tasks.filter(t => t.completed).length}/{tasks.length} 완료
                </span>
              </div>
              <div className="space-y-2 ml-1">
                {tasks.map(task => {
                  const prio = PRIORITY_CONFIG[task.priority || 'medium'];
                  return (
                    <div
                      key={task.id}
                      className={`rounded-lg border p-3 transition-colors ${task.completed ? 'bg-success/5 border-success/20' : 'border-border hover:border-primary/30'} ${isOwner && !isCheckedOut ? 'cursor-pointer' : ''}`}
                      onClick={() => isOwner && !isCheckedOut && onToggleTask(report, task.id)}
                    >
                      <div className="flex items-start gap-2.5">
                        {task.completed ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0 mt-0.5" />
                        ) : (
                          <CircleDot className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.text}
                            </span>
                            {task.priority === 'high' && (
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${prio.bg}`}>
                                {prio.label}
                              </Badge>
                            )}
                          </div>
                          {task.detail && (
                            <p className={`text-xs mt-1 ${task.completed ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}`}>
                              {task.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {report.notes && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">📝 비고</p>
              <p className="text-sm">{report.notes}</p>
            </div>
          )}

          {/* Check-out button for owner */}
          {isOwner && !isCheckedOut && (
            <>
              <Separator />
              <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-5 text-center space-y-3">
                <div className="text-2xl">🚪</div>
                <p className="text-base font-bold text-orange-700 dark:text-orange-400">퇴근 전 체크아웃을 잊지 마세요!</p>
                <p className="text-xs text-muted-foreground">각 업무를 클릭하여 완료/미완료를 표시한 후 체크아웃 버튼을 누르세요</p>
                <Button onClick={() => onToggleTask(report, '__checkout__')} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 shadow-md">
                  <LogOut className="h-5 w-5 mr-2" /> 체크아웃
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Comments section - all users can comment */}
          <CommentsSection
            reportId={report.id}
            profiles={profiles}
            currentProfile={currentProfile}
            isAdmin={isAdmin}
          />
        </CardContent>
      )}
    </Card>
  );
}

// --- Main Page ---
export default function DailyWorkReport() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'timeline' | 'person' | 'table' | 'weekly' | 'monthly' | 'yearly'>('timeline');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTasks, setNewTasks] = useState<Omit<MorningTask, 'id' | 'completed'>[]>([
    { text: '', detail: '', category: '기타', priority: 'medium' },
  ]);
  const [newNotes, setNewNotes] = useState('');
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [checkoutTargetReport, setCheckoutTargetReport] = useState<DailyReport | null>(null);

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  const fetchData = async () => {
    const [reportsRes, profilesRes] = await Promise.all([
      supabase.from('daily_work_reports').select('*').eq('date', selectedDate).order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, user_id, name, name_kr, avatar'),
    ]);
    setReports((reportsRes.data as any[]) || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedDate]);

  const myReport = reports.find(r => r.user_id === profile?.id);

  const handleCreateReport = async () => {
    if (!profile) return;
    const validTasks = newTasks.filter(t => t.text.trim());
    if (validTasks.length === 0) {
      toast({ title: '업무를 하나 이상 입력해주세요', variant: 'destructive' });
      return;
    }
    const tasks: MorningTask[] = validTasks.map((t, i) => ({
      id: `task-${Date.now()}-${i}`,
      text: t.text.trim(),
      detail: t.detail.trim(),
      category: t.category,
      priority: t.priority,
      completed: false,
    }));

    const { error } = await supabase.from('daily_work_reports').insert({
      user_id: profile.id,
      date: selectedDate,
      morning_tasks: tasks as any,
      notes: newNotes || null,
    });

    if (error) {
      toast({ title: error.code === '23505' ? '이미 체크인 되었습니다' : '등록 실패', description: error.message, variant: 'destructive' });
      return;
    }

    // Auto-sync: create tasks in the tasks table
    const priorityMap: Record<string, 'low' | 'medium' | 'high'> = { low: 'low', medium: 'medium', high: 'high' };
    const taskInserts = validTasks.map((t, i) => ({
      title: t.text.trim(),
      description: t.detail.trim() || null,
      assignee_id: profile.id,
      priority: priorityMap[t.priority] || 'medium',
      status: 'todo' as const,
      tags: [t.category],
      due_date: selectedDate,
      position: i,
    }));
    await supabase.from('tasks').insert(taskInserts);

    toast({ title: '☀️ 체크인 완료! 업무가 자동으로 등록되었습니다.' });
    setDialogOpen(false);
    setNewTasks([{ text: '', detail: '', category: '기타', priority: 'medium' }]);
    setNewNotes('');
    fetchData();
  };

  const handleToggleTask = async (report: DailyReport, taskId: string) => {
    if (report.user_id !== profile?.id) return;

    if (taskId === '__checkout__') {
      setCheckoutTargetReport(report);
      setCheckoutConfirmOpen(true);
      return;
    }

    const updatedTasks = report.morning_tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    await supabase.from('daily_work_reports').update({
      morning_tasks: updatedTasks as any,
    }).eq('id', report.id);
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

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const totalTasks = reports.reduce((sum, r) => sum + r.morning_tasks.length, 0);
  const completedTasks = reports.reduce((sum, r) => sum + r.morning_tasks.filter(t => t.completed).length, 0);
  const checkedOutCount = reports.filter(r => r.completion_checked).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">데일리 체크인</h1>
          <p className="text-sm text-muted-foreground mt-1">
            체크인으로 업무 시작 → 체크아웃으로 완료 여부 기록
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isToday && !myReport && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2 px-6 shadow-lg animate-pulse hover:animate-none bg-emerald-600 hover:bg-emerald-700 text-white">
                  <LogIn className="h-5 w-5" /> ☀️ 체크인
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>☀️ 오늘의 체크인</DialogTitle>
                  <DialogDescription>오늘 수행할 업무를 가볍게 등록하세요.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <TaskCreateForm tasks={newTasks} setTasks={setNewTasks} />
                  <div>
                    <Label className="text-sm font-medium">비고</Label>
                    <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="참고 사항..." rows={2} />
                  </div>
                  <Button onClick={handleCreateReport} className="w-full" size="lg">
                    <LogIn className="h-4 w-4 mr-1" /> 체크인
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isToday && myReport && !myReport.completion_checked && (
            <Button
              size="lg"
              className="gap-2 px-6 shadow-lg animate-pulse hover:animate-none bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => handleToggleTask(myReport, '__checkout__')}
            >
              <LogOut className="h-5 w-5" /> 🚪 체크아웃
            </Button>
          )}
        </div>
      </div>

      {/* Date navigation + summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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

        {reports.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>체크인 <strong className="text-foreground">{reports.length}</strong>명</span>
            <span>업무 <strong className="text-foreground">{completedTasks}/{totalTasks}</strong> 완료</span>
            <span>체크아웃 <strong className="text-foreground">{checkedOutCount}</strong>명</span>
          </div>
        )}
      </div>

      {/* View mode tabs */}
      <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
        <TabsList>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs">
            <LayoutList className="h-3.5 w-3.5" /> 타임라인
          </TabsTrigger>
          <TabsTrigger value="person" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> 담당자별
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5 text-xs">
            <Table2 className="h-3.5 w-3.5" /> 업무 현황표
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> 주간 요약
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" /> 월간 요약
          </TabsTrigger>
          <TabsTrigger value="yearly" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> 연간 요약
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reports */}
      {viewMode === 'yearly' ? (
        <YearlyView selectedDate={selectedDate} profiles={profiles} onNavigateToWeek={(date) => { setSelectedDate(date); setViewMode('weekly'); }} />
      ) : viewMode === 'monthly' ? (
        <MonthlyView selectedDate={selectedDate} profiles={profiles} />
      ) : viewMode === 'weekly' ? (
        <WeeklyView selectedDate={selectedDate} profiles={profiles} />
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">아직 체크인한 팀원이 없습니다</p>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              profile={profile}
              profiles={profiles}
              isAdmin={isAdmin}
              onToggleTask={handleToggleTask}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : viewMode === 'person' ? (
        <PersonView reports={reports} profiles={profiles} />
      ) : (
        <TaskTableView reports={reports} profiles={profiles} />
      )}
    </div>
  );
}

// --- Person-based Summary View ---
function PersonView({ reports, profiles }: { reports: DailyReport[]; profiles: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map(report => {
        const user = profiles.find(p => p.id === report.user_id);
        const completedCount = report.morning_tasks.filter(t => t.completed).length;
        const totalCount = report.morning_tasks.length;
        const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const isCheckedOut = report.completion_checked;

        const categoryGroups = report.morning_tasks.reduce((acc, task) => {
          const cat = task.category || '기타';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(task);
          return acc;
        }, {} as Record<string, MorningTask[]>);

        return (
          <Card key={report.id} className="overflow-hidden">
            {/* Person header */}
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{user?.avatar || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-bold text-sm">{user?.name_kr || '알 수 없음'}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[10px] ${isCheckedOut ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                      {isCheckedOut ? '🚪 체크아웃' : '☀️ 체크인'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{completedCount}/{totalCount} 완료</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">{progressPercent}%</span>
                <Progress value={progressPercent} className="h-1.5 w-16 mt-1" />
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              {Object.entries(categoryGroups).map(([category, tasks]) => (
                <div key={category}>
                  <Badge variant="outline" className={`text-[10px] font-medium mb-1.5 ${CATEGORY_COLORS[category] || CATEGORY_COLORS['기타']}`}>
                    {category}
                  </Badge>
                  <div className="space-y-1.5">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2 text-sm">
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        ) : (
                          <CircleDot className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                          {task.text}
                        </span>
                        {task.priority === 'high' && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20 shrink-0">긴급</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {report.notes && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">📝 {report.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// --- Task Summary Table View ---
function TaskTableView({ reports, profiles }: { reports: DailyReport[]; profiles: any[] }) {
  const allTasks = useMemo(() => {
    return reports.flatMap(report => {
      const user = profiles.find(p => p.id === report.user_id);
      return report.morning_tasks.map(task => ({
        ...task,
        userName: user?.name_kr || '알 수 없음',
        userAvatar: user?.avatar || '?',
        isCheckedOut: report.completion_checked,
        checkinTime: report.created_at,
        checkoutTime: report.checked_at,
      }));
    });
  }, [reports, profiles]);

  // Group by category
  const byCategory = useMemo(() => {
    const map: Record<string, typeof allTasks> = {};
    allTasks.forEach(task => {
      const cat = task.category || '기타';
      if (!map[cat]) map[cat] = [];
      map[cat].push(task);
    });
    return map;
  }, [allTasks]);

  const completedAll = allTasks.filter(t => t.completed).length;
  const totalAll = allTasks.length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">전체 업무</p>
          <p className="text-xl font-bold">{totalAll}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">완료</p>
          <p className="text-xl font-bold text-success">{completedAll}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">진행중</p>
          <p className="text-xl font-bold text-warning">{totalAll - completedAll}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">완료율</p>
          <p className="text-xl font-bold text-primary">{totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0}%</p>
        </Card>
      </div>

      {/* Tasks table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">담당자</TableHead>
                <TableHead className="w-[80px]">카테고리</TableHead>
                <TableHead>업무 내용</TableHead>
                <TableHead className="w-[70px]">우선순위</TableHead>
                <TableHead className="w-[70px]">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byCategory).map(([category, tasks]) => (
                tasks.map((task, idx) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{task.userAvatar}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">{task.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${CATEGORY_COLORS[category] || CATEGORY_COLORS['기타']}`}>
                        {category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.text}</span>
                        {task.detail && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{task.detail}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${PRIORITY_CONFIG[task.priority || 'medium'].bg}`}>
                        {PRIORITY_CONFIG[task.priority || 'medium'].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.completed ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs">완료</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CircleDot className="h-3.5 w-3.5" />
                          <span className="text-xs">진행중</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// --- Weekly Summary View ---
function WeeklyView({ selectedDate, profiles }: { selectedDate: string; profiles: any[] }) {
  const [weekReports, setWeekReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = addWeeks(new Date(selectedDate), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);
  const isCurrentWeek = isSameWeek(new Date(), baseDate, { weekStartsOn: 1 });

  useEffect(() => {
    const fetchWeek = async () => {
      setLoading(true);
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekDays[4], 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_work_reports')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('created_at', { ascending: true });
      setWeekReports((data as any[]) || []);
      setLoading(false);
    };
    fetchWeek();
  }, [selectedDate, weekOffset]);

  // Get unique users who have reports this week
  const activeUserIds = useMemo(() => {
    const ids = new Set(weekReports.map(r => r.user_id));
    return Array.from(ids);
  }, [weekReports]);

  // Build per-user, per-day stats
  const userData = useMemo(() => {
    return activeUserIds.map(userId => {
      const user = profiles.find(p => p.id === userId);
      const days = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const report = weekReports.find(r => r.user_id === userId && r.date === dateStr);
        if (!report) return { date: dateStr, total: 0, completed: 0, rate: null as number | null, checkedOut: false };
        const total = report.morning_tasks.length;
        const completed = report.morning_tasks.filter(t => t.completed).length;
        return { date: dateStr, total, completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0, checkedOut: report.completion_checked };
      });
      const weekTotal = days.reduce((s, d) => s + d.total, 0);
      const weekCompleted = days.reduce((s, d) => s + d.completed, 0);
      const weekRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : null;
      return { userId, user, days, weekTotal, weekCompleted, weekRate };
    });
  }, [activeUserIds, weekReports, weekDays, profiles]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (activeUserIds.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">이번 주 체크인 기록이 없습니다</p>
      </div>
    );
  }

  const getRateColor = (rate: number | null) => {
    if (rate === null) return 'text-muted-foreground/40';
    if (rate >= 80) return 'text-success';
    if (rate >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getRateBg = (rate: number | null) => {
    if (rate === null) return 'bg-muted/30';
    if (rate >= 80) return 'bg-success/10';
    if (rate >= 50) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold">
              <span className="text-primary mr-1.5">W{getWeek(weekStart, { weekStartsOn: 1 })}</span>
              {format(weekStart, 'M월 d일', { locale: ko })} ~ {format(weekDays[4], 'M월 d일', { locale: ko })}
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>
              이번 주
            </Button>
          )}
        </div>
        {isCurrentWeek && <Badge variant="outline" className="text-xs">이번 주</Badge>}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] sticky left-0 bg-background z-10">담당자</TableHead>
                {weekDays.map(day => (
                  <TableHead key={day.toISOString()} className="text-center min-w-[90px]">
                    <div>{format(day, 'EEE', { locale: ko })}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">{format(day, 'M/d')}</div>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[80px] bg-muted/30">주간 평균</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.map(({ userId, user, days, weekTotal, weekCompleted, weekRate }) => (
                <TableRow key={userId}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">{user?.avatar || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{user?.name_kr || '알 수 없음'}</span>
                    </div>
                  </TableCell>
                  {days.map((day, i) => (
                    <TableCell key={i} className={`text-center ${getRateBg(day.rate)}`}>
                      {day.rate !== null ? (
                        <div>
                          <span className={`text-sm font-bold ${getRateColor(day.rate)}`}>{day.rate}%</span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {day.completed}/{day.total}
                            {day.checkedOut && <span className="ml-1">🚪</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className={`text-center bg-muted/30 ${getRateBg(weekRate)}`}>
                    {weekRate !== null ? (
                      <div>
                        <span className={`text-sm font-bold ${getRateColor(weekRate)}`}>{weekRate}%</span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{weekCompleted}/{weekTotal}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Per-person weekly breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {userData.map(({ userId, user, days, weekRate }) => (
          <Card key={userId} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">{user?.avatar || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold">{user?.name_kr || '알 수 없음'}</span>
              </div>
              {weekRate !== null && (
                <span className={`text-lg font-bold ${getRateColor(weekRate)}`}>{weekRate}%</span>
              )}
            </div>
            <div className="flex gap-1">
              {days.map((day, i) => {
                const height = day.rate !== null ? Math.max(day.rate, 8) : 4;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-16 flex items-end">
                      <div
                        className={`w-full rounded-t transition-all ${
                          day.rate === null ? 'bg-muted/40' :
                          day.rate >= 80 ? 'bg-success' :
                          day.rate >= 50 ? 'bg-warning' : 'bg-destructive'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(weekDays[i], 'EEE', { locale: ko })}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Monthly Summary View ---
function MonthlyView({ selectedDate, profiles }: { selectedDate: string; profiles: any[] }) {
  const [monthReports, setMonthReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = addMonths(new Date(selectedDate), monthOffset);
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const isCurrentMonth = isSameMonth(new Date(), baseDate);

  // Get all weekdays (Mon-Fri) in the month
  const weekdaysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => {
      const day = getDay(d);
      return day >= 1 && day <= 5;
    });
  }, [monthStart.getTime(), monthEnd.getTime()]);

  // Group weekdays by week number
  const weeks = useMemo(() => {
    const map: Record<string, Date[]> = {};
    weekdaysInMonth.forEach(d => {
      const ws = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!map[ws]) map[ws] = [];
      map[ws].push(d);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [weekdaysInMonth]);

  useEffect(() => {
    const fetchMonth = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('daily_work_reports')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('created_at', { ascending: true });
      setMonthReports((data as any[]) || []);
      setLoading(false);
    };
    fetchMonth();
  }, [selectedDate, monthOffset]);

  const activeUserIds = useMemo(() => {
    return Array.from(new Set(monthReports.map(r => r.user_id)));
  }, [monthReports]);

  const userData = useMemo(() => {
    return activeUserIds.map(userId => {
      const user = profiles.find(p => p.id === userId);
      const userReports = monthReports.filter(r => r.user_id === userId);

      // Per-week stats
      const weekStats = weeks.map(([weekKey, days]) => {
        let total = 0, completed = 0, checkinDays = 0;
        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const report = userReports.find(r => r.date === dateStr);
          if (report) {
            checkinDays++;
            total += report.morning_tasks.length;
            completed += report.morning_tasks.filter(t => t.completed).length;
          }
        });
        const rate = total > 0 ? Math.round((completed / total) * 100) : null;
        return { weekKey, total, completed, checkinDays, workdays: days.length, rate };
      });

      const monthTotal = weekStats.reduce((s, w) => s + w.total, 0);
      const monthCompleted = weekStats.reduce((s, w) => s + w.completed, 0);
      const monthRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : null;
      const checkinTotal = weekStats.reduce((s, w) => s + w.checkinDays, 0);

      return { userId, user, weekStats, monthTotal, monthCompleted, monthRate, checkinTotal };
    });
  }, [activeUserIds, monthReports, weeks, profiles]);

  const getRateColor = (rate: number | null) => {
    if (rate === null) return 'text-muted-foreground/40';
    if (rate >= 80) return 'text-success';
    if (rate >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getRateBg = (rate: number | null) => {
    if (rate === null) return 'bg-muted/30';
    if (rate >= 80) return 'bg-success/10';
    if (rate >= 50) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">{format(baseDate, 'yyyy년 M월', { locale: ko })}</p>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMonthOffset(0)}>이번 달</Button>
          )}
        </div>
        {isCurrentMonth && <Badge variant="outline" className="text-xs">이번 달</Badge>}
      </div>

      {activeUserIds.length === 0 ? (
        <div className="text-center py-16">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">이번 달 체크인 기록이 없습니다</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">참여 인원</p>
              <p className="text-xl font-bold">{activeUserIds.length}명</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">총 업무</p>
              <p className="text-xl font-bold">{userData.reduce((s, u) => s + u.monthTotal, 0)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">완료 업무</p>
              <p className="text-xl font-bold text-success">{userData.reduce((s, u) => s + u.monthCompleted, 0)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">팀 평균 완료율</p>
              <p className="text-xl font-bold text-primary">
                {(() => {
                  const t = userData.reduce((s, u) => s + u.monthTotal, 0);
                  const c = userData.reduce((s, u) => s + u.monthCompleted, 0);
                  return t > 0 ? Math.round((c / t) * 100) : 0;
                })()}%
              </p>
            </Card>
          </div>

          {/* Weekly breakdown table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] sticky left-0 bg-background z-10">담당자</TableHead>
                    {weeks.map(([weekKey, days]) => {
                      const wNum = getWeek(days[0], { weekStartsOn: 1 });
                      return (
                        <TableHead key={weekKey} className="text-center min-w-[90px]">
                          <div className="text-xs font-bold text-primary">W{wNum}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {format(days[0], 'M/d')}~{format(days[days.length - 1], 'M/d')}
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="text-center min-w-[80px] bg-muted/30">월간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData.map(({ userId, user, weekStats, monthRate, checkinTotal, monthCompleted, monthTotal }) => (
                    <TableRow key={userId}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">{user?.avatar || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-xs font-medium">{user?.name_kr || '알 수 없음'}</span>
                            <div className="text-[10px] text-muted-foreground">{checkinTotal}일 출석</div>
                          </div>
                        </div>
                      </TableCell>
                      {weekStats.map((ws, i) => (
                        <TableCell key={i} className={`text-center ${getRateBg(ws.rate)}`}>
                          {ws.rate !== null ? (
                            <div>
                              <span className={`text-sm font-bold ${getRateColor(ws.rate)}`}>{ws.rate}%</span>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {ws.completed}/{ws.total} · {ws.checkinDays}일
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className={`text-center bg-muted/30 ${getRateBg(monthRate)}`}>
                        {monthRate !== null ? (
                          <div>
                            <span className={`text-sm font-bold ${getRateColor(monthRate)}`}>{monthRate}%</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{monthCompleted}/{monthTotal}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Per-person monthly bar chart cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userData.map(({ userId, user, weekStats, monthRate }) => (
              <Card key={userId} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">{user?.avatar || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-bold">{user?.name_kr || '알 수 없음'}</span>
                  </div>
                  {monthRate !== null && (
                    <span className={`text-lg font-bold ${getRateColor(monthRate)}`}>{monthRate}%</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {weekStats.map((ws, i) => {
                    const height = ws.rate !== null ? Math.max(ws.rate, 8) : 4;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-16 flex items-end">
                          <div
                            className={`w-full rounded-t transition-all ${
                              ws.rate === null ? 'bg-muted/40' :
                              ws.rate >= 80 ? 'bg-success' :
                              ws.rate >= 50 ? 'bg-warning' : 'bg-destructive'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">W{getWeek(new Date(weeks[i][0]), { weekStartsOn: 1 })}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Yearly Summary View (W1~W52) ---
function YearlyView({ selectedDate, profiles, onNavigateToWeek }: { selectedDate: string; profiles: any[]; onNavigateToWeek: (date: string) => void }) {
  const [yearReports, setYearReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearOffset, setYearOffset] = useState(0);

  const baseDate = addYears(new Date(selectedDate), yearOffset);
  const year = baseDate.getFullYear();
  const yearStart = startOfYear(baseDate);
  const yearEnd = endOfYear(baseDate);
  const isCurrentYear = isSameYear(new Date(), baseDate);

  // Build all weeks of the year (Mon-based)
  const allWeeks = useMemo(() => {
    const weeks: { weekNum: number; start: Date; end: Date; days: Date[] }[] = [];
    let current = startOfWeek(yearStart, { weekStartsOn: 1 });
    const seen = new Set<number>();

    while (current <= yearEnd) {
      const wEnd = endOfWeek(current, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: current, end: wEnd }).filter(d => {
        const day = getDay(d);
        return day >= 1 && day <= 5 && d.getFullYear() === year;
      });
      if (weekDays.length > 0) {
        const wNum = getWeek(current, { weekStartsOn: 1 });
        if (!seen.has(wNum)) {
          seen.add(wNum);
          weeks.push({ weekNum: wNum, start: weekDays[0], end: weekDays[weekDays.length - 1], days: weekDays });
        }
      }
      current = addWeeks(current, 1);
    }
    return weeks;
  }, [year]);

  useEffect(() => {
    const fetchYear = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('daily_work_reports')
        .select('*')
        .gte('date', format(yearStart, 'yyyy-MM-dd'))
        .lte('date', format(yearEnd, 'yyyy-MM-dd'))
        .order('created_at', { ascending: true });
      setYearReports((data as any[]) || []);
      setLoading(false);
    };
    fetchYear();
  }, [selectedDate, yearOffset]);

  const activeUserIds = useMemo(() => Array.from(new Set(yearReports.map(r => r.user_id))), [yearReports]);

  // Team-level weekly stats
  const teamWeeklyStats = useMemo(() => {
    return allWeeks.map(week => {
      const weekDates = week.days.map(d => format(d, 'yyyy-MM-dd'));
      const weekReports = yearReports.filter(r => weekDates.includes(r.date));
      const total = weekReports.reduce((s, r) => s + r.morning_tasks.length, 0);
      const completed = weekReports.reduce((s, r) => s + r.morning_tasks.filter(t => t.completed).length, 0);
      const rate = total > 0 ? Math.round((completed / total) * 100) : null;
      const checkins = weekReports.length;
      return { ...week, total, completed, rate, checkins };
    });
  }, [allWeeks, yearReports]);

  // Per-user yearly stats
  const userData = useMemo(() => {
    return activeUserIds.map(userId => {
      const user = profiles.find(p => p.id === userId);
      const userReports = yearReports.filter(r => r.user_id === userId);
      const totalTasks = userReports.reduce((s, r) => s + r.morning_tasks.length, 0);
      const completedTasks = userReports.reduce((s, r) => s + r.morning_tasks.filter(t => t.completed).length, 0);
      const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null;
      const checkinDays = userReports.length;
      return { userId, user, totalTasks, completedTasks, rate, checkinDays };
    });
  }, [activeUserIds, yearReports, profiles]);

  const getRateColor = (rate: number | null) => {
    if (rate === null) return 'text-muted-foreground/40';
    if (rate >= 80) return 'text-success';
    if (rate >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getHeatColor = (rate: number | null) => {
    if (rate === null) return 'bg-muted/20';
    if (rate >= 80) return 'bg-success';
    if (rate >= 50) return 'bg-warning';
    if (rate > 0) return 'bg-destructive';
    return 'bg-muted/40';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalAll = yearReports.reduce((s, r) => s + r.morning_tasks.length, 0);
  const completedAll = yearReports.reduce((s, r) => s + r.morning_tasks.filter(t => t.completed).length, 0);
  const currentWeekNum = getWeek(new Date(), { weekStartsOn: 1 });

  return (
    <div className="space-y-4">
      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYearOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">{year}년 연간 요약</p>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYearOffset(o => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentYear && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setYearOffset(0)}>올해</Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCurrentYear && <Badge variant="outline" className="text-xs">올해</Badge>}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => {
              const BOM = '\uFEFF';
              const headers = ['담당자', '체크인 일수', '총 업무', '완료', '완료율',
                ...teamWeeklyStats.map(ws => `W${ws.weekNum}`)];
              const rows = userData.map(({ userId, user, totalTasks, completedTasks, rate, checkinDays }) => {
                const userWeekRates = teamWeeklyStats.map(ws => {
                  const weekDates = ws.days.map(d => format(d, 'yyyy-MM-dd'));
                  const ur = yearReports.filter(r => r.user_id === userId && weekDates.includes(r.date));
                  const t = ur.reduce((s, r) => s + r.morning_tasks.length, 0);
                  const c = ur.reduce((s, r) => s + r.morning_tasks.filter(tk => tk.completed).length, 0);
                  return t > 0 ? `${Math.round((c / t) * 100)}%` : '';
                });
                return [
                  user?.name_kr || '알 수 없음',
                  checkinDays,
                  totalTasks,
                  completedTasks,
                  rate !== null ? `${rate}%` : '',
                  ...userWeekRates,
                ];
              });
              // Team total row
              rows.push([
                '팀 전체',
                yearReports.length,
                totalAll,
                completedAll,
                totalAll > 0 ? `${Math.round((completedAll / totalAll) * 100)}%` : '',
                ...teamWeeklyStats.map(ws => ws.rate !== null ? `${ws.rate}%` : ''),
              ]);
              const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `연간요약_${year}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            CSV 내보내기
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">참여 인원</p>
          <p className="text-xl font-bold">{activeUserIds.length}명</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">총 업무</p>
          <p className="text-xl font-bold">{totalAll}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">완료</p>
          <p className="text-xl font-bold text-success">{completedAll}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">완료율</p>
          <p className="text-xl font-bold text-primary">{totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0}%</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">총 체크인</p>
          <p className="text-xl font-bold">{yearReports.length}회</p>
        </Card>
      </div>

      {/* Heatmap - Team weekly completion rate */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">📊 주차별 팀 완료율 히트맵 (W1~W{allWeeks.length})</p>
        <div className="grid grid-cols-13 sm:grid-cols-26 gap-1">
          {teamWeeklyStats.map(ws => (
            <div
              key={ws.weekNum}
              onClick={() => onNavigateToWeek(format(ws.start, 'yyyy-MM-dd'))}
              className={`aspect-square rounded-sm ${getHeatColor(ws.rate)} relative group cursor-pointer transition-transform hover:scale-150 hover:z-10 ${
                isCurrentYear && ws.weekNum === currentWeekNum ? 'ring-2 ring-primary ring-offset-1' : ''
              }`}
              title={`W${ws.weekNum}: ${ws.rate !== null ? ws.rate + '%' : '데이터 없음'} — 클릭하여 주간 요약으로 이동`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                <div className="bg-popover text-popover-foreground border rounded-md shadow-md px-2 py-1 text-[10px] whitespace-nowrap">
                  <div className="font-bold">W{ws.weekNum}</div>
                  <div>{format(ws.start, 'M/d')}~{format(ws.end, 'M/d')}</div>
                  {ws.rate !== null ? (
                    <div>{ws.completed}/{ws.total} ({ws.rate}%) · {ws.checkins}명</div>
                  ) : (
                    <div>데이터 없음</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <span>범례:</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted/20" /> 없음</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-destructive" /> ~49%</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-warning" /> 50~79%</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-success" /> 80%+</div>
          {isCurrentYear && <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm ring-2 ring-primary" /> 이번 주</div>}
        </div>
      </Card>

      {/* Per-person yearly summary */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] sticky left-0 bg-background z-10">담당자</TableHead>
                <TableHead className="text-center w-[80px]">체크인 일수</TableHead>
                <TableHead className="text-center w-[80px]">총 업무</TableHead>
                <TableHead className="text-center w-[80px]">완료</TableHead>
                <TableHead className="text-center w-[80px]">완료율</TableHead>
                <TableHead className="text-center min-w-[200px]">연간 추이</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.map(({ userId, user, totalTasks, completedTasks, rate, checkinDays }) => {
                // Per-user weekly mini sparkline
                const userWeekRates = teamWeeklyStats.map(ws => {
                  const weekDates = ws.days.map(d => format(d, 'yyyy-MM-dd'));
                  const ur = yearReports.filter(r => r.user_id === userId && weekDates.includes(r.date));
                  const t = ur.reduce((s, r) => s + r.morning_tasks.length, 0);
                  const c = ur.reduce((s, r) => s + r.morning_tasks.filter(tk => tk.completed).length, 0);
                  return t > 0 ? Math.round((c / t) * 100) : null;
                });

                return (
                  <TableRow key={userId}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">{user?.avatar || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{user?.name_kr || '알 수 없음'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{checkinDays}일</TableCell>
                    <TableCell className="text-center text-sm">{totalTasks}</TableCell>
                    <TableCell className="text-center text-sm text-success font-medium">{completedTasks}</TableCell>
                    <TableCell className={`text-center text-sm font-bold ${getRateColor(rate)}`}>
                      {rate !== null ? `${rate}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-end gap-px h-6">
                        {userWeekRates.map((r, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-sm min-w-[2px] ${
                              r === null ? 'bg-muted/20' :
                              r >= 80 ? 'bg-success' :
                              r >= 50 ? 'bg-warning' : 'bg-destructive'
                            }`}
                            style={{ height: r !== null ? `${Math.max(r, 10)}%` : '8%' }}
                            title={`W${teamWeeklyStats[i]?.weekNum}: ${r !== null ? r + '%' : '—'}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
