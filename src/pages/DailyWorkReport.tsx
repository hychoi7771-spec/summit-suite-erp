import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus, Check, CheckCircle2, Stamp, Trash2, ChevronLeft, ChevronRight,
  Clock, CircleDot, MessageSquare, AlertTriangle, Flag, Send, ChevronDown, ChevronUp,
  LogIn, LogOut,
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EmojiReactionBar } from '@/components/daily/EmojiReactionBar';
import stampImage from '@/assets/stamp.png';

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
  director_approved: boolean;
  director_approved_by: string | null;
  director_approved_at: string | null;
  director_comment: string | null;
  ceo_approved: boolean;
  ceo_approved_by: string | null;
  ceo_approved_at: string | null;
  ceo_comment: string | null;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: '기획', label: '📋 기획' },
  { value: '디자인', label: '🎨 디자인' },
  { value: 'R&D', label: '🔬 R&D' },
  { value: '인허가', label: '📄 인허가' },
  { value: '생산', label: '🏭 생산' },
  { value: '마케팅', label: '📢 마케팅' },
  { value: '영업', label: '💼 영업' },
  { value: '관리', label: '⚙️ 관리' },
  { value: '기타', label: '📌 기타' },
];

const PRIORITY_CONFIG = {
  high: { label: '긴급', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20 text-destructive', icon: AlertTriangle },
  medium: { label: '보통', color: 'text-warning', bg: 'bg-warning/10 border-warning/20 text-warning', icon: Flag },
  low: { label: '낮음', color: 'text-muted-foreground', bg: 'bg-muted text-muted-foreground', icon: Flag },
};

const CATEGORY_COLORS: Record<string, string> = {
  '기획': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '디자인': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'R&D': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  '인허가': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '생산': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
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
            <Input
              value={task.text}
              onChange={e => update(i, { text: e.target.value })}
              placeholder="업무 제목"
              className="font-medium"
            />
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
            <Textarea
              value={task.detail}
              onChange={e => update(i, { detail: e.target.value })}
              placeholder="구체적인 작업 내용, 목표, 참고사항 등"
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addTask} className="w-full">
        <Plus className="h-3 w-3 mr-1" /> 업무 추가
      </Button>
    </div>
  );
}

function ReportCard({
  report, profile: currentProfile, profiles, userRole, isAdmin, isDirector, isCeo,
  onToggleTask, onDirectorApprove, onCeoApprove, onDelete, onSubmitComment,
}: {
  report: DailyReport;
  profile: any;
  profiles: any[];
  userRole: string;
  isAdmin: boolean;
  isDirector: boolean;
  isCeo: boolean;
  onToggleTask: (report: DailyReport, taskId: string) => void;
  onDirectorApprove: (id: string) => void;
  onCeoApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onSubmitComment: (id: string, type: 'director' | 'ceo', comment: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'director' | 'ceo' | null>(null);

  const user = profiles.find(p => p.id === report.user_id);
  const directorProfile = report.director_approved_by ? profiles.find(p => p.id === report.director_approved_by) : null;
  const ceoProfile = report.ceo_approved_by ? profiles.find(p => p.id === report.ceo_approved_by) : null;
  const isOwner = report.user_id === currentProfile?.id;
  const completedCount = report.morning_tasks.filter(t => t.completed).length;
  const totalCount = report.morning_tasks.length;
  const allCompleted = completedCount === totalCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCheckedOut = report.completion_checked;

  const categoryGroups = report.morning_tasks.reduce((acc, task) => {
    const cat = task.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, MorningTask[]>);

  const getStatusInfo = () => {
    if (report.ceo_approved) return { label: '최종 승인', className: 'bg-success/10 text-success border-success/20', icon: '✅' };
    if (report.director_approved) return { label: '이사 확인', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '📋' };
    if (isCheckedOut) return { label: '체크아웃 완료', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '🚪' };
    return { label: '체크인', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '☀️' };
  };

  const status = getStatusInfo();

  const handleSendComment = () => {
    if (!commentType || !commentText.trim()) return;
    onSubmitComment(report.id, commentType, commentText.trim());
    setCommentText('');
    setCommentType(null);
  };

  return (
    <Card className="relative overflow-hidden">
      {report.ceo_approved && (
        <div className="absolute top-4 right-4 opacity-25 pointer-events-none">
          <img src={stampImage} alt="직인" className="h-20 w-20" />
        </div>
      )}

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
          {isOwner && !report.director_approved && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(report.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Emoji reactions - always visible */}
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
                      className={`rounded-lg border p-3 transition-colors ${task.completed ? 'bg-success/5 border-success/20' : 'border-border hover:border-primary/30'} ${isOwner && !report.director_approved ? 'cursor-pointer' : ''}`}
                      onClick={() => isOwner && !report.director_approved && onToggleTask(report, task.id)}
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
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-4 text-center space-y-2">
                <p className="text-sm font-medium">퇴근 전 업무 완료 여부를 체크하고 체크아웃하세요</p>
                <p className="text-xs text-muted-foreground">각 업무를 클릭하여 완료/미완료를 표시한 후 체크아웃 버튼을 누르세요</p>
                <Button
                  onClick={() => onToggleTask(report, '__checkout__')}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <LogOut className="h-4 w-4 mr-1" /> 체크아웃
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Approval flow steps */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">승인 현황</p>
            <div className="grid grid-cols-3 gap-2">
              {/* Step 1: Check-out */}
              <div className={`rounded-lg p-3 text-center border ${isCheckedOut ? 'bg-success/5 border-success/30' : 'border-border'}`}>
                <div className={`mx-auto h-8 w-8 rounded-full flex items-center justify-center mb-1.5 ${isCheckedOut ? 'bg-success text-white' : 'bg-muted'}`}>
                  <LogOut className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium">체크아웃</p>
                <p className="text-[10px] text-muted-foreground">{completedCount}/{totalCount} 완료</p>
              </div>
              {/* Step 2: Director */}
              <div className={`rounded-lg p-3 text-center border ${report.director_approved ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'border-border'}`}>
                <div className={`mx-auto h-8 w-8 rounded-full flex items-center justify-center mb-1.5 ${report.director_approved ? 'bg-blue-500 text-white' : 'bg-muted'}`}>
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium">이사 확인</p>
                {report.director_approved ? (
                  <p className="text-[10px] text-muted-foreground">{directorProfile?.name_kr} · {format(new Date(report.director_approved_at!), 'HH:mm')}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">대기 중</p>
                )}
              </div>
              {/* Step 3: CEO */}
              <div className={`rounded-lg p-3 text-center border ${report.ceo_approved ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'border-border'}`}>
                <div className={`mx-auto h-8 w-8 rounded-full flex items-center justify-center mb-1.5 ${report.ceo_approved ? 'bg-red-500 text-white' : 'bg-muted'}`}>
                  <Stamp className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium">대표 직인</p>
                {report.ceo_approved ? (
                  <p className="text-[10px] text-muted-foreground">{ceoProfile?.name_kr} · {format(new Date(report.ceo_approved_at!), 'HH:mm')}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">대기 중</p>
                )}
              </div>
            </div>

            {/* Action buttons for admins */}
            {(isDirector || isCeo) && isCheckedOut && !report.director_approved && (
              <Button size="sm" className="w-full" onClick={() => onDirectorApprove(report.id)}>
                <Check className="h-4 w-4 mr-1" /> 이사 확인 승인
              </Button>
            )}
            {isCeo && report.director_approved && !report.ceo_approved && (
              <Button size="sm" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => onCeoApprove(report.id)}>
                <Stamp className="h-4 w-4 mr-1" /> 대표 직인 날인
              </Button>
            )}
          </div>

          {/* Feedback / Comments section */}
          {(report.director_comment || report.ceo_comment || isAdmin) && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> 코멘트
                </p>

                {report.director_comment && (() => {
                  const commenter = report.director_approved_by ? profiles.find(p => p.id === report.director_approved_by) : null;
                  return (
                    <div className="bg-muted/50 border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{commenter?.avatar || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{commenter?.name_kr || '알 수 없음'}</span>
                        {report.director_approved_at && (
                          <span className="text-[10px] text-muted-foreground">{format(new Date(report.director_approved_at), 'M/d HH:mm')}</span>
                        )}
                      </div>
                      <p className="text-sm pl-7">{report.director_comment}</p>
                    </div>
                  );
                })()}

                {report.ceo_comment && (() => {
                  const commenter = report.ceo_approved_by ? profiles.find(p => p.id === report.ceo_approved_by) : null;
                  return (
                    <div className="bg-muted/50 border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{commenter?.avatar || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{commenter?.name_kr || '알 수 없음'}</span>
                        {report.ceo_approved_at && (
                          <span className="text-[10px] text-muted-foreground">{format(new Date(report.ceo_approved_at), 'M/d HH:mm')}</span>
                        )}
                      </div>
                      <p className="text-sm pl-7">{report.ceo_comment}</p>
                    </div>
                  );
                })()}

                {/* Comment input for admins */}
                {isAdmin && (
                  <div className="space-y-2">
                    {commentType === null ? (
                      <>
                        {((isDirector || isCeo) && !report.director_comment) || (isCeo && !report.ceo_comment) ? (
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                            if ((isDirector || isCeo) && !report.director_comment) setCommentType('director');
                            else if (isCeo && !report.ceo_comment) setCommentType('ceo');
                          }}>
                            <MessageSquare className="h-3 w-3 mr-1" /> 코멘트 작성
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{currentProfile?.avatar || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{currentProfile?.name_kr || '알 수 없음'}</span>
                          </div>
                          <Textarea
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            placeholder="피드백, 개선사항, 코멘트를 입력하세요..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={handleSendComment} disabled={!commentText.trim()}>
                            <Send className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setCommentType(null); setCommentText(''); }}>
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTasks, setNewTasks] = useState<Omit<MorningTask, 'id' | 'completed'>[]>([
    { text: '', detail: '', category: '기타', priority: 'medium' },
  ]);
  const [newNotes, setNewNotes] = useState('');

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const isDirector = userRole === 'general_director';
  const isCeo = userRole === 'ceo';

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
    toast({ title: '☀️ 체크인 완료! 오늘도 파이팅!' });
    setDialogOpen(false);
    setNewTasks([{ text: '', detail: '', category: '기타', priority: 'medium' }]);
    setNewNotes('');
    fetchData();
  };

  const handleToggleTask = async (report: DailyReport, taskId: string) => {
    if (report.user_id !== profile?.id) return;

    // Checkout action
    if (taskId === '__checkout__') {
      await supabase.from('daily_work_reports').update({
        completion_checked: true,
        checked_at: new Date().toISOString(),
      }).eq('id', report.id);
      toast({ title: '🚪 체크아웃 완료! 수고하셨습니다.' });
      fetchData();
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

  const handleSubmitComment = async (reportId: string, type: 'director' | 'ceo', comment: string) => {
    const field = type === 'director' ? 'director_comment' : 'ceo_comment';
    await supabase.from('daily_work_reports').update({ [field]: comment } as any).eq('id', reportId);
    toast({ title: '코멘트 저장 완료' });
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
            ☀️ 체크인으로 업무 시작 → 🚪 체크아웃으로 완료 여부 기록
          </p>
        </div>
        {isToday && !myReport && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <LogIn className="h-4 w-4" /> 체크인
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

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">아직 체크인한 팀원이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              profile={profile}
              profiles={profiles}
              userRole={userRole || 'staff'}
              isAdmin={isAdmin}
              isDirector={isDirector}
              isCeo={isCeo}
              onToggleTask={handleToggleTask}
              onDirectorApprove={handleDirectorApprove}
              onCeoApprove={handleCeoApprove}
              onDelete={handleDelete}
              onSubmitComment={handleSubmitComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
