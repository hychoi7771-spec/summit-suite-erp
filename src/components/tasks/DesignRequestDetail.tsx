import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Palette, Paperclip, FileText, Send, MessageSquare, ImageIcon, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notifyUser } from '@/lib/notifications';

interface DesignRequestDetailProps {
  task: any;
  assignee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(url);

export default function DesignRequestDetail({ task, assignee, open, onOpenChange }: DesignRequestDetailProps) {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const daysLeft = task.due_date ? differenceInDays(startOfDay(parseISO(task.due_date)), startOfDay(new Date())) : null;

  const [comments, setComments] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !task?.id) return;
    fetchComments();
    fetchProfiles();
    const channel = supabase
      .channel(`design-task-comments-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, task?.id]);

  useEffect(() => {
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100);
  }, [comments]);

  const fetchComments = async () => {
    const { data } = await supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at', { ascending: true });
    setComments(data || []);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, name_kr, avatar, user_id');
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(p => { map[p.id] = p; });
      setProfilesMap(map);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim() || !profile) return;
    setSending(true);
    try {
      const { error } = await supabase.from('task_comments').insert({
        task_id: task.id,
        user_id: profile.id,
        content: newComment.trim(),
      });
      if (error) throw error;

      // Notify the other party (designer ↔ requester)
      const otherPartyId = profile.id === task.assignee_id ? task.created_by : task.assignee_id;
      if (otherPartyId && otherPartyId !== profile.id) {
        await notifyUser(
          otherPartyId,
          `[디자인 의뢰] 새 메시지`,
          `${profile.name_kr}님: ${newComment.trim().slice(0, 50)}${newComment.length > 50 ? '...' : ''}`,
          'task',
          task.id,
        );
      }
      setNewComment('');
    } catch (e: any) {
      toast({ title: '전송 실패', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('메시지를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('task_comments').delete().eq('id', id);
    if (error) toast({ title: '삭제 실패', variant: 'destructive' });
  };

  const imageAttachments = (task.attachments || []).filter((u: string) => isImageUrl(u));
  const fileAttachments = (task.attachments || []).filter((u: string) => !isImageUrl(u));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            디자인 의뢰서
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 담당자 & 기한 */}
          <div className="flex items-center justify-between">
            {assignee && (
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 bg-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{assignee.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{assignee.name_kr}</p>
                  <p className="text-xs text-muted-foreground">담당 디자이너</p>
                </div>
              </div>
            )}
            {daysLeft !== null && (
              <Badge variant={daysLeft <= 3 ? 'destructive' : daysLeft <= 7 ? 'secondary' : 'outline'}>
                <Calendar className="h-3 w-3 mr-1" />
                {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
              </Badge>
            )}
          </div>

          {/* 프로젝트명 */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">프로젝트명</p>
            <p className="text-sm font-medium">{task.project_name || '-'}</p>
          </div>

          {/* 상세 설명 */}
          {task.description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">상세 설명</p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* 핵심 강조 스토리 */}
          {task.key_story && (
            <div className="space-y-1 bg-primary/5 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary uppercase flex items-center gap-1">
                <FileText className="h-3 w-3" /> 핵심 강조 스토리
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.key_story}</p>
            </div>
          )}

          {/* 참고 시안 (이미지) */}
          {imageAttachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> 참고 시안 ({imageAttachments.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {imageAttachments.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt={`참고 시안 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 기타 파일 */}
          {fileAttachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> 첨부 파일 ({fileAttachments.length})
              </p>
              <div className="space-y-1">
                {fileAttachments.map((url: string, i: number) => {
                  const fileName = decodeURIComponent(url.split('/').pop() || '').replace(/^\d+-/, '');
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted rounded px-3 py-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{fileName}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* 마감일 */}
          {task.due_date && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">마감일</p>
              <p className="text-sm">{task.due_date}</p>
            </div>
          )}

          {/* 의뢰자 ↔ 디자이너 소통 */}
          <div className="space-y-2 pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> 의뢰자 · 디자이너 소통 ({comments.length})
            </p>
            <div ref={scrollRef} className="space-y-2 max-h-72 overflow-y-auto bg-muted/30 rounded-lg p-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">아직 메시지가 없습니다. 첫 메시지를 남겨보세요!</p>
              )}
              {comments.map(c => {
                const author = profilesMap[c.user_id];
                const isMine = profile?.id === c.user_id;
                const canDelete = isMine || isAdmin;
                return (
                  <div key={c.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-7 w-7 shrink-0 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{author?.avatar || '?'}</AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium">{author?.name_kr || '-'}</span>
                        <span>{format(new Date(c.created_at), 'M.d HH:mm', { locale: ko })}</span>
                        {canDelete && (
                          <button onClick={() => handleDeleteComment(c.id)} className="hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${isMine ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 메시지 입력 */}
        <div className="border-t px-6 py-3 shrink-0 bg-background">
          <div className="flex gap-2">
            <Textarea
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              className="resize-none"
            />
            <Button onClick={handleSend} disabled={!newComment.trim() || sending} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
