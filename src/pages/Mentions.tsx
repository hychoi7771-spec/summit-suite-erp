import { useState, useEffect } from 'react';
import { AtSign, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
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
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={AtSign}
        title="나를 언급"
        description="다른 팀원이 나를 @멘션한 댓글 목록입니다"
        tone="pink"
      />

      {mentions.length === 0 ? (
        <EmptyState icon={AtSign} title="아직 멘션이 없습니다" description="다른 팀원이 @로 나를 언급하면 여기에 표시됩니다." tone="rose" />
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
