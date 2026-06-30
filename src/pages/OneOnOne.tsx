import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { MessagesSquare, Lock, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface FeedbackRow {
  id: string;
  author_id: string;
  target_id: string;
  content: string;
  visibility: 'private' | 'shared';
  created_at: string;
}

export default function OneOnOne() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState('');
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    // 직속상사 + 내가 매니저인 멤버들
    (async () => {
      const [meRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('id,name_kr,name,manager_id').eq('id', profile.id).maybeSingle(),
        supabase.from('profiles').select('id,name_kr,name,manager_id').eq('manager_id', profile.id),
      ]);
      const arr: any[] = [];
      if (meRes.data?.manager_id) {
        const { data: mgr } = await supabase.from('profiles').select('id,name_kr,name').eq('id', meRes.data.manager_id).maybeSingle();
        if (mgr) arr.push({ ...mgr, _role: '직속상사' });
      }
      (membersRes.data || []).forEach(m => arr.push({ ...m, _role: '담당 팀원' }));
      setPartners(arr);
      if (arr.length && !partnerId) setPartnerId(arr[0].id);
      setLoading(false);
    })();
  }, [profile?.id]);

  useEffect(() => {
    if (!partnerId || !profile?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('one_on_one_feedback')
        .select('*')
        .or(`and(author_id.eq.${profile.id},target_id.eq.${partnerId}),and(author_id.eq.${partnerId},target_id.eq.${profile.id})`)
        .order('created_at', { ascending: false })
        .limit(100);
      setItems((data as any) || []);
    };
    load();
    const ch = supabase
      .channel(`1on1-${partnerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'one_on_one_feedback' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partnerId, profile?.id]);

  const submit = async () => {
    if (!profile?.id || !partnerId || !content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('one_on_one_feedback').insert({
      author_id: profile.id,
      target_id: partnerId,
      content: content.trim(),
      visibility,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
      return;
    }
    setContent('');
    toast({ title: visibility === 'private' ? '비공개 메모 저장됨' : '피드백 전달됨' });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('one_on_one_feedback').delete().eq('id', id);
    if (error) toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
  };

  if (loading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessagesSquare}
        title="1:1 피드백"
        description="직속상사·담당 팀원과 1:1로 주고받는 피드백 타임라인"
        tone="indigo"
      />

      {partners.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          tone="slate"
          title="아직 1:1 상대가 없습니다"
          description="팀원관리에서 직속상사(manager_id)를 설정하면 채널이 열립니다."
        />
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          <div className="space-y-1">
            {partners.map(p => (
              <button
                key={p.id}
                onClick={() => setPartnerId(p.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition ${
                  partnerId === p.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'
                }`}
              >
                <div className="font-medium">{p.name_kr || p.name}</div>
                <div className={`text-[11px] ${partnerId === p.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{p._role}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Tabs value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <TabsList>
                  <TabsTrigger value="shared"><Send className="h-3.5 w-3.5 mr-1" /> 공유 피드백</TabsTrigger>
                  <TabsTrigger value="private"><Lock className="h-3.5 w-3.5 mr-1" /> 비공개 메모</TabsTrigger>
                </TabsList>
              </Tabs>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={visibility === 'private' ? '나만 볼 수 있는 메모를 남깁니다' : '상대방도 볼 수 있는 피드백을 남깁니다'}
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={submit} disabled={submitting || !content.trim()}>저장</Button>
              </div>
            </div>

            {items.length === 0 ? (
              <EmptyState icon={MessagesSquare} tone="slate" title="아직 기록이 없어요" />
            ) : (
              <div className="space-y-2">
                {items.map(it => {
                  const mine = it.author_id === profile?.id;
                  return (
                    <div key={it.id} className={`group rounded-lg border p-3 ${it.visibility === 'private' ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60' : 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between mb-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{mine ? '내가 작성' : '상대방 작성'}</span>
                          {it.visibility === 'private' && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"><Lock className="h-3 w-3" /> 비공개</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{format(new Date(it.created_at), 'M월 d일 HH:mm', { locale: ko })}</span>
                          {mine && (
                            <button onClick={() => remove(it.id)} className="opacity-0 group-hover:opacity-100 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{it.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
