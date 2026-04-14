import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Reply, Trash2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notifyUser, notifyAllUsers } from '@/lib/notifications';

interface ProductCommentsProps {
  productId: string;
  profiles: any[];
}

export function ProductComments({ productId, profiles }: ProductCommentsProps) {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyMentionedIds, setReplyMentionedIds] = useState<string[]>([]);
  const [showReplyMentions, setShowReplyMentions] = useState(false);
  const [replyMentionFilter, setReplyMentionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  useEffect(() => { fetchComments(); }, [productId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('product_comments')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const handleMentionChange = (text: string, setText: (t: string) => void, setShow: (b: boolean) => void, setFilter: (f: string) => void) => {
    setText(text);
    const lastAt = text.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = text.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length > 0) {
        setShow(true);
        setFilter(afterAt);
        return;
      }
    }
    setShow(false);
  };

  const insertMention = (p: any, text: string, setText: (t: string) => void, setIds: React.Dispatch<React.SetStateAction<string[]>>, setShow: (b: boolean) => void, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const lastAt = text.lastIndexOf('@');
    setText(text.slice(0, lastAt) + `@${p.name_kr} `);
    setIds(prev => prev.includes(p.id) ? prev : [...prev, p.id]);
    setShow(false);
    ref.current?.focus();
  };

  const insertMentionAll = (text: string, setText: (t: string) => void, setIds: React.Dispatch<React.SetStateAction<string[]>>, setShow: (b: boolean) => void, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const lastAt = text.lastIndexOf('@');
    setText(text.slice(0, lastAt) + `@all `);
    setIds(prev => prev.includes('all') ? prev : [...prev, 'all']);
    setShow(false);
    ref.current?.focus();
  };

  const filteredProfiles = (filter: string) => {
    const lower = filter.toLowerCase();
    return profiles.filter(p =>
      p.name_kr?.toLowerCase().includes(lower) ||
      p.name?.toLowerCase().includes(lower) ||
      'all'.includes(lower)
    );
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !profile) return;
    const hasAll = mentionedIds.includes('all');
    const validUuids = mentionedIds.filter(id => id !== 'all');
    const { error } = await supabase.from('product_comments').insert({
      product_id: productId,
      user_id: profile.id,
      content: newComment.trim(),
      mentioned_user_ids: validUuids,
    });
    if (error) {
      toast({ title: '코멘트 등록 실패', variant: 'destructive' });
    } else {
      // Send notifications
      if (hasAll) {
        await notifyAllUsers(profile.id, '멘션 알림', `${profile.name_kr}님이 프로젝트 코멘트에서 @all 멘션했습니다.`, 'mention');
      } else {
        for (const uid of mentionedIds) {
          if (uid !== profile.id) {
            await notifyUser(uid, '멘션 알림', `${profile.name_kr}님이 프로젝트 코멘트에서 회원님을 멘션했습니다.`, 'mention');
          }
        }
      }
      setNewComment('');
      setMentionedIds([]);
      fetchComments();
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !profile) return;
    const replyHasAll = replyMentionedIds.includes('all');
    const replyValidUuids = replyMentionedIds.filter(id => id !== 'all');
    const { error } = await supabase.from('product_comments').insert({
      product_id: productId,
      user_id: profile.id,
      content: replyContent.trim(),
      parent_id: parentId,
      mentioned_user_ids: replyValidUuids,
    });
    if (error) {
      toast({ title: '답변 등록 실패', variant: 'destructive' });
    } else {
      if (replyHasAll) {
        await notifyAllUsers(profile.id, '멘션 알림', `${profile.name_kr}님이 프로젝트 답변에서 @all 멘션했습니다.`, 'mention');
      } else {
        for (const uid of replyMentionedIds) {
          if (uid !== profile.id) {
            await notifyUser(uid, '멘션 알림', `${profile.name_kr}님이 프로젝트 답변에서 회원님을 멘션했습니다.`, 'mention');
          }
        }
      }
      setReplyTo(null);
      setReplyContent('');
      setReplyMentionedIds([]);
      fetchComments();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('product_comments').delete().eq('id', id);
    fetchComments();
  };

  const topComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const canDelete = (comment: any) => comment.user_id === profile?.id || isAdmin;

  const MentionDropdown = ({ filter, show, text, setText, setIds, setShow, inputRef }: {
    filter: string; show: boolean; text: string;
    setText: (t: string) => void; setIds: React.Dispatch<React.SetStateAction<string[]>>;
    setShow: (b: boolean) => void; inputRef: React.RefObject<HTMLTextAreaElement | null>;
  }) => {
    if (!show) return null;
    const lower = filter.toLowerCase();
    const showAll = 'all'.includes(lower) || '전체'.includes(lower);
    const matched = profiles.filter(p => p.id !== profile?.id && (p.name_kr?.toLowerCase().includes(lower) || p.name?.toLowerCase().includes(lower)));

    if (!showAll && matched.length === 0) return null;

    return (
      <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-lg shadow-lg z-50 w-48 max-h-40 overflow-y-auto">
        {showAll && (
          <button
            className="w-full text-left px-3 py-2 hover:bg-accent text-sm font-medium text-primary"
            onClick={() => insertMentionAll(text, setText, setIds, setShow, inputRef)}
          >
            @all (전체 팀원)
          </button>
        )}
        {matched.map(p => (
          <button
            key={p.id}
            className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
            onClick={() => insertMention(p, text, setText, setIds, setShow, inputRef)}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{p.avatar}</AvatarFallback>
            </Avatar>
            {p.name_kr}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-sm">
        <MessageSquare className="h-4 w-4" />코멘트 ({comments.length})
      </h3>

      {/* New comment */}
      <div className="relative">
        <div className="flex gap-2">
          <Textarea
            ref={commentRef}
            placeholder="코멘트를 입력하세요... (@로 멘션)"
            value={newComment}
            onChange={e => handleMentionChange(e.target.value, setNewComment, setShowMentions, setMentionFilter)}
            className="min-h-[60px]"
          />
          <Button size="icon" className="shrink-0 h-10 w-10" onClick={handleAddComment} disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <MentionDropdown
          filter={mentionFilter} show={showMentions} text={newComment}
          setText={setNewComment} setIds={setMentionedIds} setShow={setShowMentions} inputRef={commentRef}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
      ) : topComments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">아직 코멘트가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {topComments.map(comment => {
            const user = getProfile(comment.user_id);
            const replies = getReplies(comment.id);
            return (
              <div key={comment.id} className="space-y-2">
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{user?.avatar || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{user?.name_kr || '알 수 없음'}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                        <Reply className="h-3 w-3" />답변
                      </Button>
                      {canDelete(comment) && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(comment.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-line">{comment.content}</p>
                </div>

                {/* Replies */}
                {replies.map(reply => {
                  const replyUser = getProfile(reply.user_id);
                  return (
                    <div key={reply.id} className="ml-6 rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-[8px]">{replyUser?.avatar || '?'}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{replyUser?.name_kr || '알 수 없음'}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(reply.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        {canDelete(reply) && (
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(reply.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-line">{reply.content}</p>
                    </div>
                  );
                })}

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="ml-6 relative">
                    <div className="flex gap-2">
                      <Textarea
                        ref={replyRef}
                        placeholder="답변을 입력하세요... (@로 멘션)"
                        value={replyContent}
                        onChange={e => handleMentionChange(e.target.value, setReplyContent, setShowReplyMentions, setReplyMentionFilter)}
                        className="min-h-[50px]"
                      />
                      <Button size="icon" className="shrink-0 h-10 w-10" onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <MentionDropdown
                      filter={replyMentionFilter} show={showReplyMentions} text={replyContent}
                      setText={setReplyContent} setIds={setReplyMentionedIds} setShow={setShowReplyMentions} inputRef={replyRef}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
