import { useState, useEffect } from 'react';
import { FileEdit, Trash2, ExternalLink, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const typeLabels: Record<string, string> = {
  task: '업무',
  notice: '공지사항',
  approval: '결재',
  expense: '경비',
  meeting: '회의',
};

export default function Drafts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });
    setDrafts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDrafts(); }, [profile]);

  const handleDelete = async (id: string) => {
    await supabase.from('drafts').delete().eq('id', id);
    toast({ title: '임시저장이 삭제되었습니다' });
    fetchDrafts();
  };

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileEdit}
        title="임시저장"
        description="작성 중이던 항목을 이어서 완성하세요"
        tone="amber"
      />

      {drafts.length === 0 ? (
        <EmptyState icon={FileEdit} title="임시저장된 항목이 없습니다" description="작성 중 자동 저장된 항목이 여기에 나타납니다." tone="amber" />
      ) : (
        <div className="space-y-2">
          {drafts.map(draft => (
            <Card key={draft.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <FileEdit className="h-4 w-4 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[9px]">{typeLabels[draft.type] || draft.type}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(draft.updated_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{draft.title || '제목 없음'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(draft.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
