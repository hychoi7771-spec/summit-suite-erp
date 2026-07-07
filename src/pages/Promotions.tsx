import { useEffect, useMemo, useState } from 'react';
import { PartyPopper, Plus, Settings, AlertTriangle, Download, CalendarDays, Table as TableIcon, LayoutDashboard } from 'lucide-react';
import { PageHeader, PastelStatCard } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PromotionTable } from '@/components/promotions/PromotionTable';
import { PromotionDialog } from '@/components/promotions/PromotionDialog';
import { ChannelManageDialog } from '@/components/promotions/ChannelManageDialog';
import { PricePolicyDialog } from '@/components/promotions/PricePolicyDialog';
import { PromotionCalendar } from '@/components/promotions/PromotionCalendar';
import { PromotionDashboard } from '@/components/promotions/PromotionDashboard';

export type Promotion = any;
export type Channel = any;
export type Policy = any;

export default function Promotions() {
  const { profile, isManager } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [listFilter, setListFilter] = useState<{ mdId: string; channelId: string }>({ mdId: 'all', channelId: 'all' });

  const fetchAll = async () => {
    const [pRes, cRes, polRes, conRes, prodRes, profRes] = await Promise.all([
      supabase.from('promotions').select('*').order('start_date', { ascending: false }),
      supabase.from('sales_channels').select('*').order('name'),
      supabase.from('channel_price_policies').select('*'),
      (supabase as any).from('promotion_conflicts').select('*'),
      supabase.from('products').select('id, name, category'),
      supabase.from('profiles').select('id, name, name_kr, avatar'),
    ]);
    setPromotions(pRes.data || []);
    setChannels(cRes.data || []);
    setPolicies(polRes.data || []);
    setConflicts(conRes.data || []);
    setProducts(prodRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('promotions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_channels' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_price_policies' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const conflictMap = useMemo(() => {
    const m = new Map<string, any>();
    conflicts.forEach((c: any) => m.set(c.promotion_id, c));
    return m;
  }, [conflicts]);

  const canEditPromotion = (p: Promotion) =>
    isManager || (profile && p.md_id === profile.id);

  const stats = useMemo(() => {
    const ongoing = promotions.filter((p) => p.status === 'ongoing').length;
    const planned = promotions.filter((p) => p.status === 'planned').length;
    const ended = promotions.filter((p) => p.status === 'ended').length;
    const violations = conflicts.filter((c: any) => c.policy_violation).length;
    return { ongoing, planned, ended, violations };
  }, [promotions, conflicts]);

  const exportCSV = () => {
    const header = ['품목', '채널', '담당MD', '유형', '시작일', '종료일', '정상가', '행사가', '할인율', '예상매출', '실제매출', '상태'];
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const channelMap = new Map(channels.map((c) => [c.id, c.name]));
    const profileMap = new Map(profiles.map((p) => [p.id, p.name_kr || p.name]));
    const rows = promotions.map((p) => {
      const discount = p.regular_price && p.promo_price ? Math.round((1 - p.promo_price / p.regular_price) * 100) + '%' : '';
      return [
        productMap.get(p.product_id) ?? '',
        channelMap.get(p.channel_id) ?? '',
        profileMap.get(p.md_id) ?? '',
        p.kind,
        p.start_date,
        p.end_date,
        p.regular_price ?? '',
        p.promo_price ?? '',
        discount,
        p.expected_revenue ?? '',
        p.actual_revenue ?? '',
        p.status,
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `promotions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openNew = () => {
    setEditingPromotion(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingPromotion(p);
    setDialogOpen(true);
  };

  const handleDelete = async (p: Promotion) => {
    if (!confirm('행사를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('promotions').delete().eq('id', p.id);
    if (error) toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    else toast({ title: '삭제되었습니다' });
  };

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={PartyPopper}
        title="행사 현황"
        description="담당 MD별 채널·품목 행사(프로모션) 통합 관리"
        tone="fuchsia"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </Button>
            {isManager && (
              <>
                <Button variant="outline" size="sm" onClick={() => setChannelDialogOpen(true)} className="gap-1.5">
                  <Settings className="h-4 w-4" /> 채널 관리
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPolicyDialogOpen(true)} className="gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> 가격 정책
                </Button>
              </>
            )}
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> 행사 등록
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PastelStatCard icon={PartyPopper} label="진행중" value={stats.ongoing} tone="emerald" />
        <PastelStatCard icon={CalendarDays} label="예정" value={stats.planned} tone="blue" />
        <PastelStatCard icon={TableIcon} label="종료" value={stats.ended} tone="slate" />
        <PastelStatCard icon={AlertTriangle} label="정책 위반" value={stats.violations} tone={stats.violations ? 'red' : 'emerald'} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-4 w-4 mr-1.5" />현황판</TabsTrigger>
          <TabsTrigger value="list"><TableIcon className="h-4 w-4 mr-1.5" />목록</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1.5" />캘린더</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <PromotionDashboard
            promotions={promotions}
            channels={channels}
            profiles={profiles}
            products={products}
            conflictMap={conflictMap}
            onSelect={openEdit}
            onFilterList={({ mdId, channelId }) => {
              setListFilter({ mdId: mdId ?? 'all', channelId: channelId ?? 'all' });
              setActiveTab('list');
            }}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <PromotionTable
            promotions={promotions}
            channels={channels}
            products={products}
            profiles={profiles}
            conflictMap={conflictMap}
            canEdit={canEditPromotion}
            onEdit={openEdit}
            onDelete={handleDelete}
            initialFilter={listFilter}
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <PromotionCalendar
            promotions={promotions}
            channels={channels}
            products={products}
            onSelect={openEdit}
          />
        </TabsContent>
      </Tabs>

      <PromotionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promotion={editingPromotion}
        channels={channels}
        products={products}
        profiles={profiles}
        policies={policies}
        defaultMdId={profile?.id}
        onSaved={fetchAll}
      />

      <ChannelManageDialog
        open={channelDialogOpen}
        onOpenChange={setChannelDialogOpen}
        channels={channels}
        profiles={profiles}
        onSaved={fetchAll}
      />
      <PricePolicyDialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        policies={policies}
        channels={channels}
        products={products}
        onSaved={fetchAll}
      />
    </div>
  );
}
