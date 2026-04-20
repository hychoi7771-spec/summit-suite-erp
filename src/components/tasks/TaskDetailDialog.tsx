import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Link2, History, Send, X, Plus, Calendar, User, Pencil, Trash2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { notifyUser, notifyAllUsers } from '@/lib/notifications';

interface TaskDetailDialogProps {
  task: any;
  profiles: any[];
  allTasks: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function TaskDetailDialog({ task, profiles, allTasks, open, onOpenChange, onUpdate }: TaskDetailDialogProps) {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const canComment = isAdmin;
  const canEditComment = (commentUserId: string) => isAdmin || commentUserId === profile?.id;
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && task) {
      fetchComments();
      fetchHistory();
      fetchLinks();
    }
  }, [open, task?.id]);

  // Realtime comments
  useEffect(() => {
    if (!open || !task) return;
    const channel = supabase
      .channel(`task-comments-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, task?.id]);

  const fetchComments = async () => {
    const { data } = await supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at', { ascending: true });
    setComments(data || []);
  };

  const handleEditComment = async (id: string) => {
    if (!editingText.trim()) return;
    const { error } = await supabase.from('task_comments').update({ content: editingText.trim() }).eq('id', id);
    if (error) { toast({ title: '댓글 수정 실패', variant: 'destructive' }); return; }
    setEditingId(null);
    setEditingText('');
    toast({ title: '댓글 수정 완료' });
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('task_comments').delete().eq('id', id);
    if (error) { toast({ title: '댓글 삭제 실패', variant: 'destructive' }); return; }
    toast({ title: '댓글 삭제 완료' });
  };

  const fetchHistory = async () => {
    const { data } = await supabase.from('task_history').select('*').eq('task_id', task.id).order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const fetchLinks = async () => {
    const { data } = await supabase
      .from('task_links')
      .select('*')
      .or(`source_task_id.eq.${task.id},target_task_id.eq.${task.id}`);
    setLinkedTasks(data || []);
  };

  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  const handleCommentChange = (text: string) => {
    setCommentText(text);
    const lastAt = text.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = text.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length > 0) {
        setShowMentions(true);
        setMentionFilter(afterAt);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (p: any) => {
    const lastAt = commentText.lastIndexOf('@');
    const newText = commentText.slice(0, lastAt) + `@${p.name_kr} `;
    setCommentText(newText);
    setMentionedIds(prev => prev.includes(p.id) ? prev : [...prev, p.id]);
    setShowMentions(false);
    commentRef.current?.focus();
  };

  const insertMentionAll = () => {
    const lastAt = commentText.lastIndexOf('@');
    const newText = commentText.slice(0, lastAt) + `@all `;
    setCommentText(newText);
    setMentionedIds(prev => prev.includes('all') ? prev : [...prev, 'all']);
    setShowMentions(false);
    commentRef.current?.focus();
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !profile) return;
    const hasAll = mentionedIds.includes('all');
    const validUuids = mentionedIds.filter(id => id !== 'all');
    const { error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: profile.id,
      content: commentText,
      mentioned_user_ids: validUuids,
    });
    if (error) { toast({ title: '댓글 작성 실패', variant: 'destructive' }); return; }

    // Notify mentioned users
    if (hasAll) {
      await notifyAllUsers(profile.id, '멘션 알림', `${profile.name_kr}님이 "${task.title}" 업무에서 @all 멘션했습니다.`, 'mention');
    } else {
      for (const uid of mentionedIds) {
        if (uid !== profile.id) {
          await notifyUser(uid, '멘션 알림', `${profile.name_kr}님이 "${task.title}" 업무에서 회원님을 멘션했습니다.`, 'mention');
        }
      }
    }

    // Record history
    await supabase.from('task_history').insert({
      task_id: task.id,
      user_id: profile.id,
      field_name: 'comment',
      new_value: commentText.slice(0, 100),
    });

    setCommentText('');
    setMentionedIds([]);
  };

  const handleAddLink = async (targetId: string) => {
    const { error } = await supabase.from('task_links').insert({
      source_task_id: task.id,
      target_task_id: targetId,
    });
    if (!error) {
      fetchLinks();
      setLinkSearch('');
      toast({ title: '업무 연결 완료' });
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    await supabase.from('task_links').delete().eq('id', linkId);
    fetchLinks();
  };

  const filteredMentions = profiles.filter(p =>
    p.name_kr.toLowerCase().includes(mentionFilter.toLowerCase()) || p.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const showAllOption = 'all'.includes(mentionFilter.toLowerCase()) || '전체'.includes(mentionFilter.toLowerCase());

  const getLinkedTask = (link: any) => {
    const linkedId = link.source_task_id === task.id ? link.target_task_id : link.source_task_id;
    return allTasks.find(t => t.id === linkedId);
  };

  const linkableResults = linkSearch.trim()
    ? allTasks.filter(t =>
        t.id !== task.id &&
        !linkedTasks.some(l => l.source_task_id === t.id || l.target_task_id === t.id) &&
        t.title.toLowerCase().includes(linkSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const assignee = getProfile(task?.assignee_id);

  const statusOptions = [
    { value: 'todo', label: '할 일' },
    { value: 'in-progress', label: '진행 중' },
    { value: 'review', label: '검토' },
    { value: 'done', label: '완료' },
  ];

  const handleStatusChange = async (newStatus: string) => {
    if (!profile) return;
    const oldStatus = task.status;
    if (oldStatus === newStatus) return;
    const { error } = await supabase.from('tasks').update({ status: newStatus as any }).eq('id', task.id);
    if (error) {
      toast({ title: '상태 변경 실패', variant: 'destructive' });
      return;
    }
    await supabase.from('task_history').insert({
      task_id: task.id,
      user_id: profile.id,
      field_name: 'status',
      old_value: oldStatus,
      new_value: newStatus,
    });
    toast({ title: '상태 변경 완료', description: `${statusOptions.find(s => s.value === oldStatus)?.label} → ${statusOptions.find(s => s.value === newStatus)?.label}` });
    onUpdate();
  };

  const fieldLabels: Record<string, string> = {
    status: '상태', priority: '우선순위', assignee_id: '담당자', title: '제목',
    description: '설명', due_date: '마감일', comment: '댓글',
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-auto h-7 text-xs gap-1 px-2.5 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${
                          s.value === 'todo' ? 'bg-slate-400' :
                          s.value === 'in-progress' ? 'bg-blue-500' :
                          s.value === 'review' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <StatusBadge status={task.priority} />
              {task.project_name && <Badge variant="outline" className="text-xs">{task.project_name}</Badge>}
            </div>
            <DialogTitle className="text-lg">{task.title}</DialogTitle>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {assignee && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary text-primary-foreground">{assignee.avatar}</AvatarFallback></Avatar>
                  {assignee.name_kr}
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{task.due_date}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="comments" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="comments" className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />댓글 ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="flex-1 gap-1.5">
              <Link2 className="h-3.5 w-3.5" />연결 ({linkedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <History className="h-3.5 w-3.5" />히스토리
            </TabsTrigger>
          </TabsList>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-3 mt-3">
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">아직 댓글이 없습니다</p>
              )}
              {comments.map(c => {
                const author = getProfile(c.user_id);
                const isEditing = editingId === c.id;
                return (
                  <div key={c.id} className="flex gap-2.5 group">
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{author?.avatar || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{author?.name_kr || '알 수 없음'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                        </span>
                        {isAdmin && !isEditing && (
                          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => { setEditingId(c.id); setEditingText(c.content); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteComment(c.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="mt-1 space-y-1.5">
                          <Textarea
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" className="h-7 gap-1" onClick={() => handleEditComment(c.id)} disabled={!editingText.trim()}>
                              <Check className="h-3 w-3" />저장
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditingId(null); setEditingText(''); }}>
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{
                          c.content.replace(/@(\S+)/g, (match: string) => `**${match}**`)
                        }</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comment Input - admin/CEO only */}
            {canComment ? (
              <div className="relative">
                <Textarea
                  ref={commentRef}
                  placeholder="댓글을 입력하세요... (@로 멘션)"
                  value={commentText}
                  onChange={e => handleCommentChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitComment(); }}
                  rows={2}
                  className="pr-10 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1.5 bottom-1.5 h-7 w-7"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>

                {/* Mention dropdown */}
                {showMentions && (filteredMentions.length > 0 || showAllOption) && (
                  <div className="absolute bottom-full mb-1 left-0 w-full bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto z-50">
                    {showAllOption && (
                      <button
                        onClick={insertMentionAll}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors font-medium text-primary"
                      >
                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary text-primary-foreground">All</AvatarFallback></Avatar>
                        @all (전체 팀원)
                      </button>
                    )}
                    {filteredMentions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => insertMention(p)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{p.avatar}</AvatarFallback></Avatar>
                        {p.name_kr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2 border-t border-border/50">
                댓글은 대표 및 관리자만 작성할 수 있습니다
              </p>
            )}
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-3 mt-3">
            <div className="relative">
              <Input
                placeholder="업무 제목으로 검색하여 연결..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                className="text-sm"
              />
              {linkableResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 w-full bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto z-50">
                  {linkableResults.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleAddLink(t.id)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <span className="truncate">{t.title}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {linkedTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">연결된 업무가 없습니다</p>
              )}
              {linkedTasks.map(link => {
                const lt = getLinkedTask(link);
                if (!lt) return null;
                return (
                  <div key={link.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border/50 bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{lt.title}</span>
                      <StatusBadge status={lt.status} />
                    </div>
                    <button onClick={() => handleRemoveLink(link.id)} className="p-0.5 hover:bg-muted rounded">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-3">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">변경 기록이 없습니다</p>
              )}
              {history.map(h => {
                const author = getProfile(h.user_id);
                return (
                  <div key={h.id} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                      <AvatarFallback className="text-[8px] bg-muted">{author?.avatar || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{author?.name_kr || '알 수 없음'}</span>
                      {h.field_name === 'comment' ? (
                        <span>이(가) 댓글을 작성했습니다</span>
                      ) : (
                        <span>이(가) <span className="font-medium">{fieldLabels[h.field_name] || h.field_name}</span>을(를)
                          {h.old_value && <> <span className="line-through">{h.old_value}</span>에서</>} <span className="font-medium text-foreground">{h.new_value}</span>(으)로 변경</span>
                      )}
                      <span className="ml-1.5">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ko })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
