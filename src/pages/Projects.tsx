import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Users, Calendar, MoreHorizontal, Pencil, Trash2, FolderKanban, Pause, CheckCircle2, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';

const categories = Constants.public.Enums.product_category;

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  active: { label: '진행중', icon: Play, color: 'bg-success/10 text-success border-success/20' },
  on_hold: { label: '보류', icon: Pause, color: 'bg-warning/10 text-warning border-warning/20' },
  completed: { label: '완료', icon: CheckCircle2, color: 'bg-muted text-muted-foreground border-border' },
};

export default function Projects() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState({
    name: '', category: '', description: '', assignee_id: '', deadline: '',
    project_status: 'active', participant_ids: [] as string[],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [prodRes, profRes, taskRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, name_kr, avatar'),
      supabase.from('tasks').select('id, status, project_name'),
    ]);
    setProjects(prodRes.data || []);
    setProfiles(profRes.data || []);
    setTasks(taskRes.data || []);
    setLoading(false);
  };

  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  const resetForm = () => {
    setEditProject(null);
    setForm({ name: '', category: '', description: '', assignee_id: '', deadline: '', project_status: 'active', participant_ids: [] });
  };

  const openEdit = (project: any) => {
    setEditProject(project);
    setForm({
      name: project.name,
      category: project.category,
      description: project.description || '',
      assignee_id: project.assignee_id || '',
      deadline: project.deadline || '',
      project_status: project.project_status || 'active',
      participant_ids: project.participant_ids || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      category: form.category as any,
      description: form.description,
      assignee_id: form.assignee_id || null,
      deadline: form.deadline || null,
      project_status: form.project_status,
      participant_ids: form.participant_ids,
    };

    if (editProject) {
      const { error } = await supabase.from('products').update(payload).eq('id', editProject.id);
      if (error) { toast({ title: '수정 실패', description: error.message, variant: 'destructive' }); return; }
      toast({ title: '프로젝트 수정 완료' });
    } else {
      const { error } = await supabase.from('products').insert({ ...payload, stage: 'Planning' as any });
      if (error) { toast({ title: '등록 실패', description: error.message, variant: 'destructive' }); return; }
      toast({ title: '프로젝트 등록 완료' });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast({ title: '삭제 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '프로젝트 삭제 완료' });
    fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('products').update({ project_status: status }).eq('id', id);
    fetchData();
  };

  const toggleParticipant = (id: string) => {
    setForm(f => ({
      ...f,
      participant_ids: f.participant_ids.includes(id)
        ? f.participant_ids.filter(p => p !== id)
        : [...f.participant_ids, id],
    }));
  };

  const filtered = filterStatus === 'all' ? projects : projects.filter(p => (p.project_status || 'active') === filterStatus);

  const getProjectTasks = (projectName: string) => tasks.filter(t => t.project_name === projectName);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">프로젝트</h1>
          <p className="text-sm text-muted-foreground mt-1">프로젝트 단위로 업무를 관리합니다</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />새 프로젝트
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: 'all', label: '전체' }, ...Object.entries(statusConfig).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <Button key={f.key} variant={filterStatus === f.key ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(f.key)}>
            {f.label} {f.key === 'all' ? `(${projects.length})` : `(${projects.filter(p => (p.project_status || 'active') === f.key).length})`}
          </Button>
        ))}
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(project => {
          const assignee = getProfile(project.assignee_id);
          const participants = (project.participant_ids || []).map((id: string) => getProfile(id)).filter(Boolean);
          const projectTasks = getProjectTasks(project.name);
          const doneTasks = projectTasks.filter(t => t.status === 'done').length;
          const totalTasks = projectTasks.length;
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : project.progress || 0;
          const sc = statusConfig[project.project_status || 'active'];

          return (
            <Card key={project.id} className="group hover:shadow-md transition-all duration-200 border-border/60">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] border ${sc.color}`}>
                        <sc.icon className="h-3 w-3 mr-1" />{sc.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{project.category}</Badge>
                    </div>
                    <h3 className="text-base font-semibold truncate">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />수정
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'active')}>
                        <Play className="h-3.5 w-3.5 mr-2" />진행중
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'on_hold')}>
                        <Pause className="h-3.5 w-3.5 mr-2" />보류
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completed')}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" />완료
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />삭제
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">진행률</span>
                    <span className="text-xs font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                  {totalTasks > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">{doneTasks}/{totalTasks} 업무 완료</p>
                  )}
                </div>

                {/* Footer: Assignee, Participants, Deadline */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    {assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{assignee.avatar}</AvatarFallback>
                      </Avatar>
                    )}
                    {participants.slice(0, 3).map((p: any) => (
                      <Avatar key={p.id} className="h-6 w-6 -ml-1.5 border-2 border-card">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px]">{p.avatar}</AvatarFallback>
                      </Avatar>
                    ))}
                    {participants.length > 3 && (
                      <span className="text-[10px] text-muted-foreground ml-1">+{participants.length - 3}</span>
                    )}
                    {!assignee && participants.length === 0 && (
                      <span className="text-xs text-muted-foreground">담당자 미지정</span>
                    )}
                  </div>
                  {project.deadline && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {project.deadline}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty state / Add card */}
        {filtered.length === 0 && (
          <Card className="border-2 border-dashed border-muted-foreground/20 flex items-center justify-center min-h-[200px] cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => { resetForm(); setDialogOpen(true); }}>
            <div className="text-center">
              <FolderKanban className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">프로젝트가 없습니다</p>
              <p className="text-xs text-muted-foreground mt-1">새 프로젝트를 만들어 보세요</p>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editProject ? '프로젝트 수정' : '새 프로젝트'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>프로젝트명</Label>
              <Input placeholder="프로젝트명 입력" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select value={form.project_status} onValueChange={v => setForm(f => ({ ...f, project_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">진행중</SelectItem>
                    <SelectItem value="on_hold">보류</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>담당자</Label>
                <Select value={form.assignee_id} onValueChange={v => setForm(f => ({ ...f, assignee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>마감일</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />참여자</Label>
              <div className="flex flex-wrap gap-1.5">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParticipant(p.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
                      form.participant_ids.includes(p.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px]">{p.avatar}</AvatarFallback>
                    </Avatar>
                    {p.name_kr}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea placeholder="프로젝트 설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button onClick={handleSubmit} disabled={!form.name || !form.category} className="w-full">
              {editProject ? '수정' : '등록'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
