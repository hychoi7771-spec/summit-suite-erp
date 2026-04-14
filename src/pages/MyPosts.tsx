import { useState, useEffect } from 'react';
import { MessageSquare, FileText, Palette, ListTodo } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PostItem {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  content: string;
  created_at: string;
  icon: any;
}

export default function MyPosts() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const [taskComments, productComments, designComments, notices] = await Promise.all([
        supabase.from('task_comments').select('id, content, created_at, task_id').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('product_comments').select('id, content, created_at, product_id').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('design_review_comments').select('id, content, created_at, review_id').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('notices').select('id, title, content, created_at').eq('author_id', profile.id).order('created_at', { ascending: false }).limit(50),
      ]);

      const items: PostItem[] = [
        ...(taskComments.data || []).map(c => ({
          id: c.id, type: 'task_comment', typeLabel: '업무 댓글', title: '업무 댓글', content: c.content, created_at: c.created_at, icon: ListTodo,
        })),
        ...(productComments.data || []).map(c => ({
          id: c.id, type: 'product_comment', typeLabel: '프로젝트 댓글', title: '프로젝트 댓글', content: c.content, created_at: c.created_at, icon: FileText,
        })),
        ...(designComments.data || []).map(c => ({
          id: c.id, type: 'design_comment', typeLabel: '디자인 피드백', title: '디자인 피드백', content: c.content, created_at: c.created_at, icon: Palette,
        })),
        ...(notices.data || []).map(n => ({
          id: n.id, type: 'notice', typeLabel: '공지사항', title: n.title, content: n.content, created_at: n.created_at, icon: FileText,
        })),
      ];

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPosts(items);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  const typeFilter = (type?: string) => type ? posts.filter(p => p.type === type) : posts;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">내 게시물</h1>
        <p className="text-sm text-muted-foreground mt-1">내가 작성한 댓글, 피드백, 공지사항을 확인하세요</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">전체 ({posts.length})</TabsTrigger>
          <TabsTrigger value="task_comment">업무 댓글 ({typeFilter('task_comment').length})</TabsTrigger>
          <TabsTrigger value="product_comment">프로젝트 ({typeFilter('product_comment').length})</TabsTrigger>
          <TabsTrigger value="design_comment">디자인 ({typeFilter('design_comment').length})</TabsTrigger>
          <TabsTrigger value="notice">공지 ({typeFilter('notice').length})</TabsTrigger>
        </TabsList>

        {['all', 'task_comment', 'product_comment', 'design_comment', 'notice'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
            {typeFilter(tab === 'all' ? undefined : tab).length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">게시물이 없습니다</p>
              </div>
            ) : (
              typeFilter(tab === 'all' ? undefined : tab).map(post => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <post.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[9px]">{post.typeLabel}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                        </div>
                        {post.type === 'notice' && <p className="text-sm font-medium text-foreground mb-0.5">{post.title}</p>}
                        <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
