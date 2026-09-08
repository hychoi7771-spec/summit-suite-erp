import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessTripDialog } from '@/components/trips/BusinessTripDialog';
import { Plane, Plus, MapPin, CalendarRange, Wallet, Users, BedDouble, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusLabels: Record<string, string> = { pending: '결재 대기', approved: '승인', rejected: '반려' };
const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const tripDays = (t: any) => {
  const s = new Date(t.start_date), e = new Date(t.end_date);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
};

export default function BusinessTrips() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const isDirector = userRole === 'ceo' || userRole === 'general_director';

  const fetchData = async () => {
    const [tripRes, profRes] = await Promise.all([
      (supabase.from('business_trips' as any) as any).select('*').order('start_date', { ascending: false }),
      supabase.from('profiles').select('id, name, name_kr'),
    ]);
    setTrips(tripRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('business-trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_trips' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const nameOf = (id: string) => profiles.find(p => p.id === id)?.name_kr || '—';

  const myTrips = useMemo(() => trips.filter(t => t.user_id === profile?.id), [trips, profile]);
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trips.filter(t => t.end_date >= today && t.status !== 'rejected');
  }, [trips]);

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const mine = myTrips.filter(t => t.start_date?.startsWith(String(year)));
    return {
      count: mine.length,
      days: mine.reduce((s, t) => s + tripDays(t), 0),
      cost: mine.reduce((s, t) => s + (t.estimated_cost || 0), 0),
      pending: myTrips.filter(t => t.status === 'pending').length,
    };
  }, [myTrips]);

  const canEdit = (t: any) => isDirector || (t.user_id === profile?.id && t.status === 'pending');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase.from('business_trips' as any) as any).delete().eq('id', deleteTarget.id);
    if (deleteTarget.approval_id && !error) {
      await supabase.from('approval_steps').delete().eq('approval_id', deleteTarget.approval_id);
      await supabase.from('approvals').delete().eq('id', deleteTarget.approval_id);
    }
    setDeleteTarget(null);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '삭제 완료', description: '출장 신청이 삭제되었습니다.' });
    fetchData();
  };

  const TripCard = ({ t }: { t: any }) => (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold truncate">{t.destination}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{nameOf(t.user_id)}</p>
          </div>
          <Badge variant="outline" className={statusStyles[t.status]}>{statusLabels[t.status]}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarRange className="h-3.5 w-3.5" />
            {t.start_date}{t.start_date !== t.end_date ? ` ~ ${t.end_date}` : ''} ({tripDays(t)}일)
          </span>
          {t.transport && <span>{t.transport}</span>}
          {t.accommodation && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />숙박</span>}
          {t.estimated_cost ? (
            <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />{t.estimated_cost.toLocaleString()}원</span>
          ) : null}
          {t.companions && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t.companions}</span>}
        </div>

        {t.purpose && <p className="whitespace-pre-wrap text-sm">{t.purpose}</p>}
        {t.note && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.note}</p>}

        {canEdit(t) && (
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setEditTarget(t); setDialogOpen(true); }}>
              <Pencil className="mr-1 h-3.5 w-3.5" />수정
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(t)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />삭제
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const List = ({ items }: { items: any[] }) => (
    items.length === 0
      ? <EmptyState icon={Plane} title="출장 내역이 없습니다" description="출장 신청 버튼으로 새 출장을 등록해보세요." />
      : <div className="grid gap-3 md:grid-cols-2">{items.map(t => <TripCard key={t.id} t={t} />)}</div>
  );

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="출장 신청"
        description="지방·현장 출장을 신청하고 결재 진행 상황과 일정을 한 곳에서 관리합니다."
        action={
          <Button onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />출장 신청
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '올해 내 출장', value: `${stats.count}건` },
          { label: '올해 출장 일수', value: `${stats.days}일` },
          { label: '예상 경비 합계', value: `${stats.cost.toLocaleString()}원` },
          { label: '결재 대기', value: `${stats.pending}건` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="mine">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="mine">내 출장 ({myTrips.length})</TabsTrigger>
          <TabsTrigger value="upcoming">예정/진행 ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="all">전체 ({trips.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4"><List items={myTrips} /></TabsContent>
        <TabsContent value="upcoming" className="mt-4"><List items={upcoming} /></TabsContent>
        <TabsContent value="all" className="mt-4"><List items={trips} /></TabsContent>
      </Tabs>

      <BusinessTripDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null); }}
        onCreated={fetchData}
        trip={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출장 신청을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              연결된 결재 문서도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
