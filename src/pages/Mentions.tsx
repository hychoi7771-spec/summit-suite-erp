import { useState, useEffect } from 'react';
import { AtSign, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Mentions() {
  const { profile } = useAuth();
  const [mentions, setMentions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const [mentionedRes, allMentionedRes, profRes] = await Promise.all([
        supabase.from('task_comments').select('*').contains('mentioned_user_ids', [profile.id]).order('created_at', { ascending: false }).limit(100),
        supabase.from('task_comments').select('*').contains('mentioned_user_ids', ['all']).order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id, name, name_kr, avatar'),
      ]);
      // Merge and deduplicate
      const allComments = [...(mentionedRes.data || []), ...(allMentionedRes.data || [])];
      const unique = Array.from(new Map(allComments.map(c => [c.id, c])).values());
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMentions(unique.filter(c => c.user_id !== profile.id));
      setProfiles(profRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">나를 언급</h1>
        <p className="text-sm text-muted-foreground mt-1">다른 팀원이 나를 @멘션한 댓글 목록입니다</p>
      </div>

      {mentions.length === 0 ? (
        <div className="text-center py-16">
          <AtSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">아직 멘션이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mentions.map(m => {
            const author = getProfile(m.user_id);
            return (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{author?.avatar || '??'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">{author?.name_kr || author?.name}</span>
                        <Badge variant="outline" className="text-[9px]">
                          <AtSign className="h-2.5 w-2.5 mr-0.5" />멘션
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{m.content}</p>
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
