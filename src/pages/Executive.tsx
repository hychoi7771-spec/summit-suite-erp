import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Crown, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, Users, ListTodo,
  Stamp, Receipt, DollarSign, FolderKanban, Megaphone, Send, ClipboardList,
  Zap, ArrowRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, differenceInHours, differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

function pct(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function KpiCard({ icon: Icon, label, value, change, suffix, onClick, accent }: any) {
  const isUp = change != null && change >= 0;
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${accent || 'bg-primary/10 text-primary'}`}>
            <Icon className="h-4 w-4" />
          </div>
          {change != null && (
            <Badge variant={isUp ? 'default' : 'destructive'} className="text-xs gap-1">
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold tracking-tight">
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

export default function Executive() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [instructOpen, setInstructOpen] = useState(false);
  const [instructPrefill, setInstructPrefill] = useState<{ title?: string; assignee?: string } | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);

  const allowed = userRole === 'ceo' || userRole === 'general_director' || userRole === 'managing_director';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['executive-stats', period],
    enabled: allowed,
    staleTime: 15_000,
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const prevMonthStart = startOfMonth(subDays(monthStart, 1));
      const prevMonthEnd = endOfMonth(subDays(monthStart, 1));
      const todayStr = format(now, 'yyyy-MM-dd');
      const monthStr = format(now, 'yyyy-MM');
      const prevMonthStr = format(subDays(monthStart, 1), 'yyyy-MM');

      const [
        tasksRes, approvalsRes, expensesRes, salesRes,
        leavesRes, profilesRes, categoriesRes, meetingsRes, noticesRes,
      ] = await Promise.all([
        supabase.from('tasks').select('id,title,status,priority,assignee_id,due_date,category_id,created_at,updated_at,project_name'),
        supabase.from('approvals').select('id,title,type,status,requester_id,current_approver_id,created_at,approved_at,rejected_at'),
        supabase.from('expenses').select('id,date,amount,category,status,payment_method,submitted_by'),
        supabase.from('sales_data').select('id,platform,month,revenue,target,orders'),
        supabase.from('leave_requests').select('id,user_id,leave_type,start_date,end_date,days,status'),
        supabase.from('profiles').select('id,user_id,name_kr,name,avatar'),
        supabase.from('task_categories').select('id,name,color,icon').order('sort_order'),
        supabase.from('meetings').select('id,title,date,category'),
        supabase.from('notices').select('id,title,created_at'),
      ]);

      return {
        tasks: tasksRes.data || [],
        approvals: approvalsRes.data || [],
        expenses: expensesRes.data || [],
        sales: salesRes.data || [],
        leaves: leavesRes.data || [],
        profiles: profilesRes.data || [],
        categories: categoriesRes.data || [],
        meetings: meetingsRes.data || [],
        notices: noticesRes.data || [],
        meta: { monthStr, prevMonthStr, todayStr, monthStart, monthEnd, prevMonthStart, prevMonthEnd, now },
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const { tasks, approvals, expenses, sales, leaves, profiles, categories, meta } = data;

    // KPIs
    const mtdRevenue = sales.filter((s) => s.month === meta.monthStr).reduce((a, b) => a + (b.revenue || 0), 0);
    const prevRevenue = sales.filter((s) => s.month === meta.prevMonthStr).reduce((a, b) => a + (b.revenue || 0), 0);

    const inProgressProjects = new Set(tasks.filter((t) => t.status === 'in-progress' && t.project_name).map((t) => t.project_name)).size;

    const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < meta.todayStr && t.status !== 'done');
    const pendingApprovals = approvals.filter((a) => a.status === 'pending');

    const todayLeaves = leaves.filter((l) => l.status === 'approved' && l.start_date <= meta.todayStr && l.end_date >= meta.todayStr);
    const totalEmployees = profiles.length;
    const presentToday = Math.max(0, totalEmployees - todayLeaves.length);
    const attendanceRate = totalEmployees ? (presentToday / totalEmployees) * 100 : 0;

    const pendingExpenses = expenses.filter((e) => e.status === 'Pending');
    const mtdExpenses = expenses
      .filter((e) => e.date >= format(meta.monthStart, 'yyyy-MM-dd') && e.date <= format(meta.monthEnd, 'yyyy-MM-dd'))
      .reduce((a, b) => a + (b.amount || 0), 0);
    const prevMtdExpenses = expenses
      .filter((e) => e.date >= format(meta.prevMonthStart, 'yyyy-MM-dd') && e.date <= format(meta.prevMonthEnd, 'yyyy-MM-dd'))
      .reduce((a, b) => a + (b.amount || 0), 0);

    // Diagnostics — anomalies
    const diagnostics: { id: string; severity: 'high' | 'mid' | 'low'; title: string; detail: string; action?: { label: string; href?: string }; instruct?: { title: string } }[] = [];

    overdueTasks.slice(0, 5).forEach((t) => {
      const days = differenceInDays(meta.now, parseISO(t.due_date));
      diagnostics.push({
        id: `ovd-${t.id}`,
        severity: days > 7 ? 'high' : 'mid',
        title: `마감 ${days}일 초과: ${t.title}`,
        detail: t.project_name || '',
        action: { label: '업무 보기', href: '/tasks' },
        instruct: { title: `[독촉] ${t.title} 즉시 처리 요망` },
      });
    });

    const stuckTasks = tasks.filter((t) => {
      if (t.status !== 'in-progress' || !t.updated_at) return false;
      return differenceInDays(meta.now, parseISO(t.updated_at)) >= 7;
    });
    if (stuckTasks.length) {
      diagnostics.push({
        id: 'stuck',
        severity: 'mid',
        title: `7일+ 진행 정체 업무 ${stuckTasks.length}건`,
        detail: stuckTasks.slice(0, 3).map((t) => t.title).join(', '),
        action: { label: '업무 보기', href: '/tasks' },
      });
    }

    const stalledApprovals = approvals.filter((a) => {
      if (a.status !== 'pending') return false;
      return differenceInHours(meta.now, parseISO(a.created_at)) >= 48;
    });
    if (stalledApprovals.length) {
      diagnostics.push({
        id: 'apprv-stall',
        severity: 'high',
        title: `48시간+ 정체 결재 ${stalledApprovals.length}건`,
        detail: stalledApprovals.slice(0, 3).map((a) => a.title).join(', '),
        action: { label: '결재 보기', href: '/approvals' },
      });
    }

    // Expense category surge
    const byCatMonth: Record<string, number> = {};
    const byCatPrev: Record<string, number> = {};
    expenses.forEach((e) => {
      if (e.date >= format(meta.monthStart, 'yyyy-MM-dd') && e.date <= format(meta.monthEnd, 'yyyy-MM-dd'))
        byCatMonth[e.category] = (byCatMonth[e.category] || 0) + (e.amount || 0);
      else if (e.date >= format(meta.prevMonthStart, 'yyyy-MM-dd') && e.date <= format(meta.prevMonthEnd, 'yyyy-MM-dd'))
        byCatPrev[e.category] = (byCatPrev[e.category] || 0) + (e.amount || 0);
    });
    Object.entries(byCatMonth).forEach(([cat, curr]) => {
      const prev = byCatPrev[cat] || 0;
      if (prev > 0 && curr / prev >= 1.3) {
        diagnostics.push({
          id: `exp-${cat}`,
          severity: 'mid',
          title: `경비 급증: ${cat} (+${(((curr - prev) / prev) * 100).toFixed(0)}%)`,
          detail: `${curr.toLocaleString()}원 (전월 ${prev.toLocaleString()}원)`,
          action: { label: '경비 보기', href: '/expenses' },
        });
      }
    });

    // Workforce quadrant
    const presenceData = [
      { name: '출근', value: presentToday },
      { name: '휴가/외근', value: todayLeaves.length },
    ];

    // Tasks by category
    const tasksByCat = categories.map((c) => {
      const items = tasks.filter((t) => t.category_id === c.id);
      const completed = items.filter((t) => t.status === 'done').length;
      return { name: c.name, total: items.length, completed, color: c.color };
    }).filter((c) => c.total > 0);

    // Workload by assignee
    const workload = profiles.map((p) => {
      const open = tasks.filter((t) => t.assignee_id === p.id && t.status !== 'done').length;
      return { name: p.name_kr || p.name, value: open };
    }).filter((w) => w.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

    // Sales trend (last 6 months)
    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(meta.now.getFullYear(), meta.now.getMonth() - i, 1);
      monthLabels.push(format(d, 'yyyy-MM'));
    }
    const salesTrend = monthLabels.map((m) => ({
      month: m.slice(5) + '월',
      revenue: sales.filter((s) => s.month === m).reduce((a, b) => a + (b.revenue || 0), 0),
      target: sales.filter((s) => s.month === m).reduce((a, b) => a + (b.target || 0), 0),
    }));

    // Expense category Top5
    const expenseTop = Object.entries(byCatMonth).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

    // Approvals metrics
    const completedApprovals = approvals.filter((a) => a.approved_at || a.rejected_at);
    const avgHours = completedApprovals.length
      ? completedApprovals.reduce((acc, a) => acc + differenceInHours(parseISO(a.approved_at || a.rejected_at!), parseISO(a.created_at)), 0) / completedApprovals.length
      : 0;
    const approvalsByStatus = [
      { name: '대기', value: approvals.filter((a) => a.status === 'pending').length },
      { name: '승인', value: approvals.filter((a) => a.status === 'approved').length },
      { name: '반려', value: approvals.filter((a) => a.status === 'rejected').length },
    ];

    return {
      kpis: {
        revenue: mtdRevenue, revenueChange: pct(mtdRevenue, prevRevenue),
        projects: inProgressProjects,
        overdue: overdueTasks.length,
        pendingApprovals: pendingApprovals.length,
        attendance: attendanceRate,
        pendingExpenses: pendingExpenses.length,
        expenseAmount: mtdExpenses, expenseChange: pct(mtdExpenses, prevMtdExpenses),
      },
      diagnostics,
      presenceData,
      tasksByCat,
      workload,
      salesTrend,
      expenseTop,
      stalledApprovals,
      avgApprovalHours: avgHours,
      approvalsByStatus,
      totalEmployees,
    };
  }, [data]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CEO 인사이트</h1>
            <p className="text-sm text-muted-foreground">대표 전용 통합 대시보드</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v: any) => setPeriod(v)}>
            <TabsList>
              <TabsTrigger value="today">오늘</TabsTrigger>
              <TabsTrigger value="week">주</TabsTrigger>
              <TabsTrigger value="month">월</TabsTrigger>
              <TabsTrigger value="quarter">분기</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="grid place-items-center py-20 text-muted-foreground">데이터 집계 중...</div>
      ) : (
        <>
          {/* ① KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={DollarSign} label="이번달 매출" value={`${(stats.kpis.revenue / 10000).toLocaleString()}만`} change={stats.kpis.revenueChange} accent="bg-emerald-500/10 text-emerald-600" onClick={() => navigate('/sales')} />
            <KpiCard icon={FolderKanban} label="진행중 프로젝트" value={stats.kpis.projects} accent="bg-blue-500/10 text-blue-600" onClick={() => navigate('/projects')} />
            <KpiCard icon={AlertTriangle} label="지연 업무" value={stats.kpis.overdue} accent="bg-rose-500/10 text-rose-600" onClick={() => navigate('/tasks')} />
            <KpiCard icon={Stamp} label="대기 결재" value={stats.kpis.pendingApprovals} accent="bg-violet-500/10 text-violet-600" onClick={() => navigate('/approvals')} />
            <KpiCard icon={Users} label="출근률" value={stats.kpis.attendance.toFixed(0)} suffix="%" accent="bg-cyan-500/10 text-cyan-600" onClick={() => navigate('/attendance')} />
            <KpiCard icon={Receipt} label="이번달 경비" value={`${(stats.kpis.expenseAmount / 10000).toLocaleString()}만`} change={stats.kpis.expenseChange} accent="bg-amber-500/10 text-amber-600" onClick={() => navigate('/expenses')} />
          </div>

          {/* ② Diagnostics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                경영진단 · 이상신호 ({stats.diagnostics.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.diagnostics.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  현재 감지된 이상신호가 없습니다.
                </div>
              ) : (
                <ScrollArea className="max-h-[320px]">
                  <div className="space-y-2">
                    {stats.diagnostics.map((d) => (
                      <div key={d.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <Badge variant={d.severity === 'high' ? 'destructive' : 'secondary'} className="shrink-0 mt-0.5">
                            {d.severity === 'high' ? '긴급' : '주의'}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{d.title}</p>
                            {d.detail && <p className="text-xs text-muted-foreground truncate">{d.detail}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {d.instruct && (
                            <Button size="sm" variant="default" className="h-7" onClick={() => { setInstructPrefill({ title: d.instruct!.title }); setInstructOpen(true); }}>
                              지시하기
                            </Button>
                          )}
                          {d.action && (
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => d.action!.href && navigate(d.action!.href)}>
                              {d.action.label} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* ③ Quadrants */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* A. Workforce */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> 인력 · 근태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">전체</p>
                    <p className="text-xl font-bold">{stats.totalEmployees}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <p className="text-xs text-muted-foreground">출근</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.presenceData[0].value}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <p className="text-xs text-muted-foreground">휴가/외근</p>
                    <p className="text-xl font-bold text-amber-600">{stats.presenceData[1].value}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">담당자별 업무 부하 (미완료)</p>
                  {stats.workload.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">데이터 없음</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.workload} layout="vertical" margin={{ left: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* B. Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><ListTodo className="h-4 w-4" /> 업무 · 프로젝트</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.tasksByCat.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">데이터 없음</p>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-3">
                      {stats.tasksByCat.map((c) => {
                        const rate = c.total ? (c.completed / c.total) * 100 : 0;
                        return (
                          <div key={c.name}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium" style={{ color: c.color }}>{c.name}</span>
                              <span className="text-xs text-muted-foreground">{c.completed}/{c.total} · {rate.toFixed(0)}%</span>
                            </div>
                            <Progress value={rate} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* C. Finance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4" /> 매출 · 재무</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">월 매출 추세 (6개월)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={stats.salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()}원`} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="매출" />
                      <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} name="목표" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">경비 카테고리 Top5 (이번달)</p>
                  {stats.expenseTop.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">데이터 없음</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={stats.expenseTop}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                        <Tooltip formatter={(v: number) => `${v.toLocaleString()}원`} />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* D. Approvals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Stamp className="h-4 w-4" /> 결재 · 의사결정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">평균 처리</p>
                    <p className="text-lg font-bold">{stats.avgApprovalHours.toFixed(1)}<span className="text-xs font-normal">h</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 text-center">
                    <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-amber-600" />
                    <p className="text-xs text-muted-foreground">48h+ 정체</p>
                    <p className="text-lg font-bold text-amber-600">{stats.stalledApprovals.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                    <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs text-muted-foreground">승인률</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {(() => {
                        const total = stats.approvalsByStatus[1].value + stats.approvalsByStatus[2].value;
                        return total ? ((stats.approvalsByStatus[1].value / total) * 100).toFixed(0) : 0;
                      })()}%
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={stats.approvalsByStatus} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} label>
                      {stats.approvalsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {stats.stalledApprovals.length > 0 && (
                  <Button variant="outline" size="sm" className="w-full" onClick={async () => {
                    const ids = stats.stalledApprovals.map((a) => a.current_approver_id).filter(Boolean);
                    if (!ids.length) return toast.error('대상자가 없습니다');
                    const { data: prof } = await supabase.from('profiles').select('user_id').in('id', ids as string[]);
                    const userIds = (prof || []).map((p) => p.user_id);
                    await supabase.rpc('send_notifications', {
                      _user_ids: userIds,
                      _title: '결재 독촉',
                      _message: `48시간 이상 정체된 결재 ${stats.stalledApprovals.length}건이 있습니다. 즉시 처리해주세요.`,
                      _type: 'approval',
                    });
                    toast.success(`${userIds.length}명에게 독촉 알림 발송`);
                  }}>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> 정체 결재 일괄 독촉
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ④ Control Bar (sticky) */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-background/95 backdrop-blur border-t p-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground hidden md:block flex items-center gap-1">
            <Crown className="h-3 w-3 inline" /> 경영진 컨트롤 센터
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setBroadcastOpen(true)}>
              <Megaphone className="h-3.5 w-3.5 mr-1.5" /> 긴급공지
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setInstructPrefill(null); setInstructOpen(true); }}>
              <ListTodo className="h-3.5 w-3.5 mr-1.5" /> 업무 지시
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMeetingOpen(true)}>
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> 회의 소집
            </Button>
          </div>
        </div>
      </div>

      <InstructDialog open={instructOpen} onOpenChange={setInstructOpen} prefill={instructPrefill} profiles={data?.profiles || []} categories={data?.categories || []} onDone={() => queryClient.invalidateQueries({ queryKey: ['executive-stats'] })} />
      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} profiles={data?.profiles || []} />
      <MeetingDialog open={meetingOpen} onOpenChange={setMeetingOpen} profiles={data?.profiles || []} />
    </div>
  );
}

/* ============ Dialogs ============ */

function InstructDialog({ open, onOpenChange, prefill, profiles, categories, onDone }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [priority, setPriority] = useState<string>('high');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // sync prefill
  useMemo(() => {
    if (open && prefill?.title) setTitle(prefill.title);
    if (open && !prefill) { setTitle(''); setDescription(''); }
  }, [open, prefill]);

  const submit = async () => {
    if (!title.trim() || !assigneeId) return toast.error('제목과 담당자를 입력하세요');
    setSubmitting(true);
    try {
      let category_id: string | null = null;
      try {
        const { data: cls } = await supabase.functions.invoke('classify-task', { body: { title, description } });
        category_id = (cls as any)?.category_id ?? null;
      } catch {}
      const { data: task, error } = await supabase.from('tasks').insert({
        title, description, assignee_id: assigneeId, priority: priority as any,
        due_date: dueDate || null, status: 'todo' as any, category_id,
        tags: ['경영진지시'],
      }).select().single();
      if (error) throw error;
      const target = profiles.find((p: any) => p.id === assigneeId);
      if (target?.user_id) {
        await supabase.rpc('send_notifications', {
          _user_ids: [target.user_id],
          _title: '🚨 경영진 업무 지시',
          _message: title,
          _type: 'task',
          _related_id: task.id,
        });
      }
      toast.success('업무 지시 등록 및 알림 발송 완료');
      onOpenChange(false);
      onDone?.();
      setTitle(''); setDescription(''); setAssigneeId(''); setDueDate('');
    } catch (e: any) {
      toast.error(e.message || '실패');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> 경영진 업무 지시</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>제목 *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 신제품 출시 일정 확인" /></div>
          <div><Label>지시 내용</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>담당자 *</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>우선순위</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">긴급</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>마감일</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? '발송 중...' : '지시 발송'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BroadcastDialog({ open, onOpenChange, profiles }: any) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [popup, setPopup] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error('제목을 입력하세요');
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();
      const { data: notice, error } = await supabase.from('notices').insert({
        title, content, author_id: prof?.id, is_pinned: true, show_as_popup: popup,
      }).select().single();
      if (error) throw error;
      const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);
      await supabase.rpc('send_notifications', {
        _user_ids: userIds, _title: `📢 ${title}`, _message: content || '긴급공지가 발행되었습니다',
        _type: 'notice', _related_id: notice.id,
      });
      toast.success(`전사 ${userIds.length}명에게 공지 발송 완료`);
      onOpenChange(false); setTitle(''); setContent('');
    } catch (e: any) { toast.error(e.message || '실패'); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-rose-500" /> 긴급공지 발행</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>제목 *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>내용</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} /></div>
          <div className="flex items-center gap-2"><Checkbox id="popup" checked={popup} onCheckedChange={(c) => setPopup(!!c)} /><Label htmlFor="popup" className="cursor-pointer">전 직원에게 팝업으로 표시</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={submitting} className="bg-rose-600 hover:bg-rose-700">{submitting ? '발송 중...' : '전사 발행'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingDialog({ open, onOpenChange, profiles }: any) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const submit = async () => {
    if (!title.trim() || selected.length === 0) return toast.error('제목과 참석자를 입력하세요');
    setSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase.from('meetings').insert({
        title, date: today, attendee_ids: selected, category: '경영진소집', notes,
      });
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('calendar_events').insert({
        title: `[긴급회의] ${title}`, date: today, color: 'red', created_by: user!.id, description: notes,
      });
      const attUsers = profiles.filter((p: any) => selected.includes(p.id)).map((p: any) => p.user_id).filter(Boolean);
      await supabase.rpc('send_notifications', {
        _user_ids: attUsers, _title: '🔔 긴급회의 소집', _message: `오늘: ${title}`, _type: 'meeting',
      });
      toast.success(`${attUsers.length}명 회의 소집 알림 발송`);
      onOpenChange(false); setTitle(''); setNotes(''); setSelected([]);
    } catch (e: any) { toast.error(e.message || '실패'); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-500" /> 긴급회의 즉시 소집</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>회의 제목 *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>안건/메모</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          <div>
            <Label>참석자 * ({selected.length}명)</Label>
            <ScrollArea className="h-40 border rounded-md p-2 mt-1">
              <div className="grid grid-cols-2 gap-2">
                {profiles.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                    {p.name_kr || p.name}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? '발송 중...' : '소집 발송'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
