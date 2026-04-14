import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, Target, Activity, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formatKRW = (n: number) => `₩${(n / 1000000).toFixed(1)}M`;

export default function Sales() {
  const { toast } = useToast();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ platform: '', month: '', revenue: '', target: '', roas: '', orders: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('sales_data').select('*').order('month', { ascending: false });
    setSalesData(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const { error } = await supabase.from('sales_data').insert({
      platform: form.platform,
      month: form.month,
      revenue: parseInt(form.revenue),
      target: parseInt(form.target),
      roas: parseFloat(form.roas),
      orders: parseInt(form.orders),
    });
    if (error) {
      toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '매출 데이터 등록 완료' });
      setDialogOpen(false);
      setForm({ platform: '', month: '', revenue: '', target: '', roas: '', orders: '' });
      fetchData();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const febData = salesData.filter(s => s.month === '2026-02');
  const totalRevenue = febData.reduce((a, b) => a + b.revenue, 0);
  const totalOrders = febData.reduce((a, b) => a + b.orders, 0);
  const avgROAS = febData.length > 0 ? (febData.reduce((a, b) => a + Number(b.roas), 0) / febData.length).toFixed(1) : '0';
  const totalTarget = febData.reduce((a, b) => a + b.target, 0);
  const targetAchievement = totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0;

  const platformData = febData.map(d => ({
    platform: d.platform,
    revenue: d.revenue / 1000000,
    target: d.target / 1000000,
    roas: Number(d.roas),
    orders: d.orders,
    achievement: d.target > 0 ? Math.round((d.revenue / d.target) * 100) : 0,
  }));

  const stats = [
    { label: '총 매출', value: formatKRW(totalRevenue), icon: TrendingUp },
    { label: '총 주문수', value: totalOrders, icon: ShoppingCart },
    { label: '평균 ROAS', value: `${avgROAS}x`, icon: Activity },
    { label: '목표 달성률', value: `${targetAchievement}%`, icon: Target },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">매출 & KPI</h1>
          <p className="text-sm text-muted-foreground mt-1">플랫폼 성과 및 매출 추적</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0"><Plus className="h-4 w-4" />매출 데이터 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>매출 데이터 추가</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2"><Label>플랫폼</Label><Input placeholder="와디즈" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} /></div>
              <div className="space-y-2"><Label>월 (YYYY-MM)</Label><Input placeholder="2026-03" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>매출 (원)</Label><Input type="number" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} /></div>
                <div className="space-y-2"><Label>목표 (원)</Label><Input type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} /></div>
                <div className="space-y-2"><Label>ROAS</Label><Input type="number" step="0.1" value={form.roas} onChange={e => setForm(f => ({ ...f, roas: e.target.value }))} /></div>
                <div className="space-y-2"><Label>주문 수</Label><Input type="number" value={form.orders} onChange={e => setForm(f => ({ ...f, orders: e.target.value }))} /></div>
              </div>
              <Button onClick={handleSubmit} disabled={!form.platform || !form.month || !form.revenue} className="w-full">등록</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted"><stat.icon className="h-4 w-4 text-muted-foreground" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">매출 vs 목표 (2026년 2월)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,90%)" />
                    <XAxis dataKey="platform" tick={{ fontSize: 12 }} stroke="hsl(210,15%,45%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(210,15%,45%)" tickFormatter={v => `₩${v}M`} />
                    <Tooltip formatter={(v: number) => [`₩${v}M`, '']} />
                    <Bar dataKey="target" fill="hsl(210,20%,90%)" radius={[4, 4, 0, 0]} name="목표" />
                    <Bar dataKey="revenue" fill="hsl(195,80%,40%)" radius={[4, 4, 0, 0]} name="매출" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">데이터가 없습니다</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">플랫폼별 KPI</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">데이터가 없습니다</p>}
              {platformData.map(p => (
                <div key={p.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{p.platform}</h4>
                    <span className="text-sm font-semibold">{p.achievement}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(p.achievement, 100)}%`, backgroundColor: p.achievement >= 100 ? 'hsl(152,60%,40%)' : 'hsl(210,100%,18%)' }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>ROAS: {p.roas}x</span><span>{p.orders}건 주문</span><span>₩{p.revenue}M / ₩{p.target}M</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
