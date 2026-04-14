import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Package, ListTodo, Receipt, DollarSign, Users, ArrowUpRight, ArrowDownRight, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const PIE_COLORS = ['hsl(210,20%,90%)', 'hsl(210,100%,50%)', 'hsl(38,92%,50%)', 'hsl(152,60%,40%)'];

const statusColors: Record<string, string> = {
  working: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground/40',
};

export default function Dashboard() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'ceo' || userRole === 'general_director';
  const [products, setProducts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [prodRes, taskRes, expRes, salesRes, profRes, roleRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('sales_data').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
    ]);
    setProducts(prodRes.data || []);
    setTasks(taskRes.data || []);
    setExpenses(expRes.data || []);
    setSalesData(salesRes.data || []);
    setProfiles(profRes.data || []);
    setRoles(roleRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_data' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalRevenue = salesData.filter(s => s.month === '2026-02').reduce((a: number, b: any) => a + b.revenue, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'Pending').reduce((a: number, b: any) => a + b.amount, 0);
  const activeTasks = tasks.filter(t => t.status !== 'done').length;
  const activeProducts = products.filter(p => p.stage !== 'Launch').length;

  const stats = [
    { label: '월 매출', value: `₩${(totalRevenue / 1000000).toFixed(1)}M`, change: '+12.5%', up: true, icon: DollarSign, color: 'text-success' },
    { label: '진행 중 제품', value: activeProducts, change: `총 ${products.length}개`, up: true, icon: Package, color: 'text-accent' },
    { label: '미완료 업무', value: activeTasks, change: `총 ${tasks.length}건`, up: false, icon: ListTodo, color: 'text-info' },
    { label: '대기 중 경비', value: `₩${(pendingExpenses / 1000000).toFixed(1)}M`, change: `${expenses.filter(e => e.status === 'Pending').length}건 청구`, up: false, icon: Receipt, color: 'text-warning' },
  ];

  const revenueByPlatform = salesData
    .filter(s => s.month === '2026-02')
    .map(s => ({ name: s.platform, revenue: s.revenue / 1000000, target: s.target / 1000000 }));

  const taskDistribution = [
    { name: '할 일', value: tasks.filter(t => t.status === 'todo').length },
    { name: '진행 중', value: tasks.filter(t => t.status === 'in-progress').length },
    { name: '검토', value: tasks.filter(t => t.status === 'review').length },
    { name: '완료', value: tasks.filter(t => t.status === 'done').length },
  ];

  const roleLabels: Record<string, string> = {
    ceo: '대표이사', general_director: '이사', deputy_gm: '부장',
    md: '차장', designer: '대리', staff: '사원',
  };

  const roleOrder: Record<string, number> = {
    ceo: 0, general_director: 1, deputy_gm: 2, md: 3, designer: 4, staff: 5,
  };

  const sortedProfiles = [...profiles].sort((a, b) => {
    const roleA = roles.find(r => r.user_id === a.user_id);
    const roleB = roles.find(r => r.user_id === b.user_id);
    return (roleOrder[roleA?.role] ?? 99) - (roleOrder[roleB?.role] ?? 99);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground text-sm mt-1">SHFoodHub — 경영 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
            <Card className="stat-card">
              <CardContent className="p-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.up ? <ArrowUpRight className="h-3 w-3 text-success" /> : <ArrowDownRight className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">{stat.change}</span>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">플랫폼별 매출 (2026년 2월)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {revenueByPlatform.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByPlatform} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,90%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(210,15%,45%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(210,15%,45%)" tickFormatter={v => `₩${v}M`} />
                    <Tooltip formatter={(v: number) => [`₩${v}M`, '']} />
                    <Bar dataKey="target" fill="hsl(210,20%,90%)" radius={[4, 4, 0, 0]} name="목표" />
                    <Bar dataKey="revenue" fill="hsl(210,100%,18%)" radius={[4, 4, 0, 0]} name="매출" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">매출 데이터가 없습니다</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">업무 분포</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4}>
                    {taskDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {taskDistribution.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매출 트렌드 차트 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 매출 트렌드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {(() => {
              const months = [...new Set(salesData.map(s => s.month))].sort();
              const trendData = months.map(m => {
                const monthData = salesData.filter(s => s.month === m);
                return {
                  month: m.slice(5) + '월',
                  revenue: monthData.reduce((a, b) => a + b.revenue, 0) / 1000000,
                  target: monthData.reduce((a, b) => a + b.target, 0) / 1000000,
                };
              });
              return trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210,15%,45%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(210,15%,45%)" tickFormatter={v => `₩${v}M`} />
                    <Tooltip formatter={(v: number) => [`₩${v.toFixed(1)}M`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(210,100%,50%)" strokeWidth={2} dot={{ r: 4 }} name="매출" />
                    <Line type="monotone" dataKey="target" stroke="hsl(210,20%,70%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="목표" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">매출 데이터가 없습니다</div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">제품 파이프라인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">등록된 제품이 없습니다</p>
            ) : products.map((product) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <StatusBadge status={product.stage} />
                  </div>
                  <Progress value={product.progress} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{product.progress}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">팀 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedProfiles.map((member) => {
              const memberTasks = tasks.filter(t => t.assignee_id === member.id && t.status !== 'done');
              const role = roles.find(r => r.user_id === member.user_id);
              return (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8 bg-primary">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusColors[member.presence] || 'bg-muted-foreground/40'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name_kr}</p>
                      <p className="text-xs text-muted-foreground">{role ? roleLabels[role.role] || role.role : '사원'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{memberTasks.length}</p>
                    <p className="text-xs text-muted-foreground">진행 중 업무</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 관리자 전용: 실시간 접속 현황 */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              실시간 접속 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedProfiles.map((member) => {
                const role = roles.find(r => r.user_id === member.user_id);
                const presenceLabel: Record<string, string> = { working: '업무 중', away: '자리 비움', offline: '오프라인' };
                const presenceColor: Record<string, string> = { working: 'text-success', away: 'text-warning', offline: 'text-muted-foreground/40' };
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                    <div className="relative">
                      <Avatar className="h-9 w-9 bg-primary">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusColors[member.presence] || 'bg-muted-foreground/40'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name_kr}</p>
                      <p className="text-xs text-muted-foreground">{role ? roleLabels[role.role] || role.role : '사원'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Circle className={`h-2 w-2 fill-current ${presenceColor[member.presence] || 'text-muted-foreground/40'}`} />
                      <span className="text-xs text-muted-foreground">{presenceLabel[member.presence] || '오프라인'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
