import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Heart, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const CATEGORY_META: Record<string, { label: string; emoji: string; bg: string; ring: string }> = {
  thanks: { label: '감사', emoji: '🙏', bg: 'bg-rose-50 dark:bg-rose-950/30', ring: 'ring-rose-200 dark:ring-rose-900' },
  collab: { label: '협업', emoji: '🤝', bg: 'bg-sky-50 dark:bg-sky-950/30', ring: 'ring-sky-200 dark:ring-sky-900' },
  creative: { label: '창의', emoji: '💡', bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'ring-amber-200 dark:ring-amber-900' },
  growth: { label: '성장', emoji: '🌱', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'ring-emerald-200 dark:ring-emerald-900' },
};

interface KudosRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  category: string;
  message: string;
  created_at: string;
  from?: { name_kr: string | null; name: string; avatar: string | null };
  to?: { name_kr: string | null; name: string; avatar: string | null };
}

export default function Kudos() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<KudosRow[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [toId, setToId] = useState('');
  const [category, setCategory] = useState('thanks');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('kudos')
      .select('*, from:profiles!kudos_from_user_id_fkey(name_kr,name,avatar), to:profiles!kudos_to_user_id_fkey(name_kr,name,avatar)')
      .order('created_at', { ascending: false })
      .limit(100);
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('profiles').select('id,name_kr,name,avatar').then(({ data }) => setProfiles(data || []));
    const ch = supabase
      .channel('kudos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kudos' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    if (!profile?.id || !toId || !message.trim()) {
      toast({ title: '받는 사람과 메시지를 입력해주세요', variant: 'destructive' });
      return;
    }
    if (toId === profile.id) {
      toast({ title: '본인에게 보낼 수 없습니다', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('kudos').insert({
      from_user_id: profile.id,
      to_user_id: toId,
      category,
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: '전송 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '칭찬을 전달했어요 ✨' });
    setMessage(''); setToId(''); setCategory('thanks'); setOpen(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('kudos').delete().eq('id', id);
    if (error) toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
  };

  if (loading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="칭찬·감사 보드"
        description="동료에게 고마움과 응원을 남겨보세요"
        tone="rose"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> 칭찬 보내기</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>칭찬 보내기</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">받는 사람</label>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger><SelectValue placeholder="동료를 선택하세요" /></SelectTrigger>
                    <SelectContent>
                      {profiles.filter(p => p.id !== profile?.id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">카테고리</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_META).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">메시지</label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="구체적인 행동과 그것이 어떤 도움이 되었는지 적어주세요" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button onClick={submit} disabled={submitting}>{submitting ? '전송중...' : '보내기'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Heart} tone="rose" title="아직 칭찬이 없어요" description="첫 칭찬을 남겨 분위기를 띄워볼까요?" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(k => {
            const meta = CATEGORY_META[k.category] || CATEGORY_META.thanks;
            const mine = k.from_user_id === profile?.id;
            return (
              <div key={k.id} className={`relative group rounded-xl p-4 ring-1 ${meta.ring} ${meta.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/60">
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(k.created_at), 'M월 d일', { locale: ko })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{k.message}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span><b className="text-foreground">{k.from?.name_kr || k.from?.name}</b> → <b className="text-foreground">{k.to?.name_kr || k.to?.name}</b></span>
                  {mine && (
                    <button onClick={() => remove(k.id)} className="opacity-0 group-hover:opacity-100 text-destructive transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
