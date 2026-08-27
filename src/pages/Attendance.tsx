import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Clock, CheckCircle2, XCircle, Trash2, Loader2, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek, isSameMonth, parseISO, isWithinInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { LeaveRequestDialog } from '@/components/attendance/LeaveRequestDialog';
import { Progress } from '@/components/ui/progress';
import { isNonWorkingDay, isWeekend, getHolidayName } from '@/lib/holidays';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: '연차', half_day: '반차', summer: '여름휴가',
  family_event: '경조사', sick: '병가', other: '기타',
};

const LEAVE_TYPE_COLOR: Record<string, string> = {
  annual: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  half_day: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  summer: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  family_event: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  sick: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  other: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소',
};
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export default function Attendance() {
  const { profile, userRole, isManager } = useAuth();
  const { toast } = useToast();
  // 실장(managing_director)도 인사/근태 관리자: 휴가 신청 승인·수정·삭제 가능
  const isAdmin = isManager || userRole === 'managing_director';
  // 연차/월차 적립·사용일수 확정 수정 권한: 총괄이사(최하용)·대표만
  const isBalanceAdmin = userRole === 'general_director' || userRole === 'ceo';


  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const [recalculating, setRecalculating] = useState(false);

  const withRecalc = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setRecalculating(true);
    try {
      return await fn();
    } finally {
      await fetchData();
      setRecalculating(false);
    }
  };

  const ROLE_ORDER: Record<string, number> = {
    ceo: 0, general_director: 1, managing_director: 2, deputy_gm: 3, md: 4, designer: 5, assistant_manager: 6, staff: 7,
  };

  const fetchData = async () => {
    const [reqRes, balRes, profRes, roleRes] = await Promise.all([
      supabase.from('leave_requests').select('*').order('start_date', { ascending: false }),
      supabase.from('leave_balances').select('*').eq('year', year),
      supabase.from('profiles').select('id, user_id, name_kr, avatar, hire_date'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    const roles = roleRes.data || [];
    const sorted = (profRes.data || []).slice().sort((a, b) => {
      const ra = roles.find(r => r.user_id === a.user_id)?.role;
      const rb = roles.find(r => r.user_id === b.user_id)?.role;
      return (ROLE_ORDER[ra] ?? 99) - (ROLE_ORDER[rb] ?? 99);
    });
    setRequests(reqRes.data || []);
    setBalances(balRes.data || []);
    setProfiles(sorted);
    setUserRoles(roles);
  };

  const recalculateAll = async () => {
    await withRecalc(async () => {
      const { error } = await supabase.rpc('run_monthly_leave_grant');
      if (error) { toast({ title: '재계산 실패', description: error.message, variant: 'destructive' }); return; }
      toast({ title: '휴가 적립 자동 재계산 완료' });
    });
  };

  const updateHireDate = async (profileId: string, date: string) => {
    await withRecalc(async () => {
      const { error } = await supabase.from('profiles').update({ hire_date: date || null }).eq('id', profileId);
      if (error) { toast({ title: '입사일 저장 실패', description: error.message, variant: 'destructive' }); return; }
      await supabase.rpc('calculate_leave_grant', { _profile_id: profileId, _today: format(new Date(), 'yyyy-MM-dd') });
      toast({ title: '입사일 업데이트 및 휴가 재계산 완료' });
    });
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, async () => {
        setRecalculating(true);
        try {
          await supabase.rpc('run_monthly_leave_grant');
          await fetchData();
        } finally { setRecalculating(false); }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_balances' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [year]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  // 오늘 휴무자 (주말/공휴일이면 전원 비근무)
  const today = new Date();
  const todayIsNonWorking = isNonWorkingDay(today);
  const todayHolidayName = getHolidayName(today);
  const todayLeaves = requests.filter(r =>
    r.status === 'approved' &&
    isWithinInterval(today, { start: parseISO(r.start_date), end: parseISO(r.end_date) }),
  );
  const workingMembers = todayIsNonWorking
    ? []
    : profiles.filter(p => !todayLeaves.some(l => l.user_id === p.id));

  // 캘린더 - 휴가자 매핑
  const calendarStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getLeavesOnDate = (date: Date) =>
    requests.filter(r =>
      r.status === 'approved' &&
      isWithinInterval(date, { start: parseISO(r.start_date), end: parseISO(r.end_date) }),
    );

  // 잔액 매핑
  const balanceFor = (userId: string) => balances.find(b => b.user_id === userId);

  const updateBalance = async (userId: string, total: number) => {
    await withRecalc(async () => {
      const existing = balanceFor(userId);
      if (existing) {
        const { error } = await supabase.from('leave_balances')
          .update({ total_days: total }).eq('id', existing.id);
        if (error) { toast({ title: '저장 실패', description: error.message, variant: 'destructive' }); return; }
      } else {
        const { error } = await supabase.from('leave_balances')
          .insert({ user_id: userId, year, total_days: total, used_days: 0 });
        if (error) { toast({ title: '저장 실패', description: error.message, variant: 'destructive' }); return; }
      }
      toast({ title: '연차 적립일수가 업데이트되었습니다' });
    });
  };

  const isSubYear = (profileId: string) => {
    const p = profiles.find(x => x.id === profileId);
    if (!p?.hire_date) return false;
    const anniv = new Date(p.hire_date);
    anniv.setFullYear(anniv.getFullYear() + 1);
    return new Date() < anniv;
  };

  const recalcUser = async (profileId: string) => {
    await supabase.rpc('calculate_leave_grant', {
      _profile_id: profileId,
      _today: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const updateUsedDays = async (userId: string, used: number) => {
    await withRecalc(async () => {
      const existing = balanceFor(userId);
      const subYear = isSubYear(userId);
      const patch = subYear ? { monthly_used_days: used } : { used_days: used };
      if (existing) {
        const { error } = await supabase.from('leave_balances').update(patch).eq('id', existing.id);
        if (error) { toast({ title: '저장 실패', description: error.message, variant: 'destructive' }); return; }
      } else {
        const base: any = { user_id: userId, year, total_days: 0, used_days: 0 };
        const { error } = await supabase.from('leave_balances').insert({ ...base, ...patch });
        if (error) { toast({ title: '저장 실패', description: error.message, variant: 'destructive' }); return; }
      }
      toast({ title: '사용일수가 업데이트되었습니다' });
    });
  };

  const cancelMyRequest = async (id: string) => {
    // 휴가 신청 정보 가져오기 (연결된 결재/캘린더 함께 정리하기 위함)
    const { data: req } = await supabase.from('leave_requests')
      .select('id, user_id, approval_id, calendar_event_id, status').eq('id', id).maybeSingle();

    const { error } = await supabase.from('leave_requests')
      .update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast({ title: '취소 실패', description: error.message, variant: 'destructive' }); return; }

    // 연결된 결재가 살아있으면 반려 처리하여 재신청 흐름이 꼬이지 않도록 함
    if (req?.approval_id) {
      await supabase.from('approvals')
        .update({ status: 'rejected', rejected_reason: '신청자 취소', rejected_at: new Date().toISOString() })
        .eq('id', req.approval_id);
      await supabase.from('approval_steps')
        .update({ status: 'rejected', acted_at: new Date().toISOString(), comment: '신청자 취소' })
        .eq('approval_id', req.approval_id)
        .eq('status', 'pending');
    }
    if (req?.user_id) await recalcUser(req.user_id);
    toast({ title: '신청이 취소되었습니다' });
    fetchData();
  };

  const deleteRequest = async (req: any) => {
    // approval_steps는 approval_id ON DELETE CASCADE → approvals 삭제 시 자동 처리
    if (req.approval_id) {
      const { error: appErr } = await supabase.from('approvals').delete().eq('id', req.approval_id);
      if (appErr) { toast({ title: '결재 삭제 실패', description: appErr.message, variant: 'destructive' }); return; }
    }
    if (req.calendar_event_id) {
      await supabase.from('calendar_events').delete().eq('id', req.calendar_event_id);
    }
    const { error } = await supabase.from('leave_requests').delete().eq('id', req.id);
    if (error) { toast({ title: '삭제 실패', description: error.message, variant: 'destructive' }); return; }
    await recalcUser(req.user_id);
    toast({ title: '휴가 신청이 삭제되었습니다' });
    fetchData();
  };

  const myRequests = requests.filter(r => r.user_id === profile?.id);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarCheck}
        title="근태관리"
        description="휴가 신청 · 승인 현황 · 남은 휴가를 한눈에 관리하세요."
        tone="sky"
        actions={
          <Button onClick={() => setShowRequest(true)} className="gap-2">
            <Plus className="h-4 w-4" /> 휴가 신청
          </Button>
        }
      />

      {/* 오늘 현황 위젯 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />오늘 근무</CardTitle></CardHeader>
          <CardContent>
            {todayIsNonWorking ? (
              <>
                <div className="text-2xl font-bold text-muted-foreground">
                  {todayHolidayName || (today.getDay() === 0 ? '일요일' : '토요일')}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {todayHolidayName ? '🎌 공휴일' : '🛌 주말'}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{workingMembers.length}명</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {workingMembers.slice(0, 8).map(p => (
                    <Avatar key={p.id} className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-success/20 text-success">{p.avatar}</AvatarFallback>
                    </Avatar>
                  ))}
                  {workingMembers.length > 8 && <span className="text-xs text-muted-foreground self-center ml-1">+{workingMembers.length - 8}</span>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4" />오늘 휴무</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLeaves.length}명</div>
            <div className="space-y-1 mt-2">
              {todayLeaves.slice(0, 3).map(l => {
                const p = getProfile(l.user_id);
                return (
                  <div key={l.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{p?.avatar}</AvatarFallback></Avatar>
                    <span className="font-medium">{p?.name_kr}</span>
                    <Badge variant="outline" className={`${LEAVE_TYPE_COLOR[l.leave_type]} text-[10px] py-0 px-1.5`}>
                      {LEAVE_TYPE_LABEL[l.leave_type]}
                    </Badge>
                  </div>
                );
              })}
              {todayLeaves.length === 0 && <p className="text-xs text-muted-foreground">전원 근무 중</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" />결재 대기</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}건</div>
            <p className="text-xs text-muted-foreground mt-2">승인 대기중인 휴가 신청</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="calendar" className="shrink-0">월별 캘린더</TabsTrigger>
          <TabsTrigger value="my" className="shrink-0">내 신청 내역</TabsTrigger>
          <TabsTrigger value="all" className="shrink-0">전체 신청</TabsTrigger>
          <TabsTrigger value="team" className="shrink-0">담당별 현황</TabsTrigger>
          <TabsTrigger value="summer" className="shrink-0">🏖️ 여름휴가 현황</TabsTrigger>
        </TabsList>

        {/* 월별 캘린더 */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentMonth(new Date())}>오늘</Button>
                <Button size="icon" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <div
                    key={d}
                    className={`bg-muted px-2 py-1.5 text-xs font-medium text-center ${
                      i === 0 ? 'text-destructive' : i === 6 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                    }`}
                  >
                    {d}
                  </div>
                ))}
                {calendarDays.map(day => {
                  const leaves = getLeavesOnDate(day);
                  const isToday = isSameDay(day, today);
                  const inMonth = isSameMonth(day, currentMonth);
                  const dow = day.getDay();
                  const holidayName = getHolidayName(day);
                  const nonWorking = isWeekend(day) || !!holidayName;
                  const dayNumColor = holidayName || dow === 0
                    ? 'text-destructive'
                    : dow === 6
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground';
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[90px] p-1.5 ${nonWorking ? 'bg-muted/40' : 'bg-background'} ${!inMonth ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`text-xs font-medium ${isToday ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground' : dayNumColor}`}>
                          {format(day, 'd')}
                        </div>
                        {holidayName && (
                          <span className="text-[9px] text-destructive font-medium truncate" title={holidayName}>
                            {holidayName}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {leaves.slice(0, 3).map(l => {
                          const p = getProfile(l.user_id);
                          return (
                            <div key={l.id} className={`text-[10px] px-1 py-0.5 rounded border truncate ${LEAVE_TYPE_COLOR[l.leave_type]}`}>
                              {p?.name_kr} · {LEAVE_TYPE_LABEL[l.leave_type]}
                            </div>
                          );
                        })}
                        {leaves.length > 3 && <div className="text-[10px] text-muted-foreground">+{leaves.length - 3}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 내 신청 내역 */}
        <TabsContent value="my" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">내 휴가 신청 내역</CardTitle></CardHeader>
            <CardContent>
              <RequestList
                requests={myRequests}
                profiles={profiles}
                showOwner={false}
                onCancel={cancelMyRequest}
                onDelete={isAdmin ? deleteRequest : undefined}
                isAdmin={isAdmin}
                myProfileId={profile?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 전체 신청 */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">전체 휴가 신청</CardTitle></CardHeader>
            <CardContent>
              <RequestList
                requests={requests}
                profiles={profiles}
                showOwner
                onCancel={isAdmin ? cancelMyRequest : undefined}
                onDelete={isAdmin ? deleteRequest : undefined}
                isAdmin={isAdmin}
                myProfileId={profile?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 담당별 사용/잔여 현황표 */}
        <TabsContent value="team" className="space-y-4 mt-4">
          <TeamLeaveTable
            balances={balances}
            profiles={profiles}
            userRoles={userRoles}
            requests={requests}
            year={year}
            onYearChange={setYear}
            myProfileId={profile?.id}
          />

        </TabsContent>

        {/* 🏖️ 여름휴가 현황 */}
        <TabsContent value="summer" className="space-y-4 mt-4">
          <SummerLeaveOverview
            requests={requests}
            profiles={profiles}
            year={year}
            onYearChange={setYear}
          />
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog open={showRequest} onOpenChange={setShowRequest} onCreated={fetchData} />
    </div>
  );
}

function RequestList({
  requests, profiles, showOwner, onCancel, onDelete, isAdmin, myProfileId,
}: {
  requests: any[];
  profiles: any[];
  showOwner: boolean;
  onCancel?: (id: string) => void;
  onDelete?: (req: any) => void;
  isAdmin?: boolean;
  myProfileId?: string;
}) {
  const getProfile = (id: string) => profiles.find(p => p.id === id);
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">신청 내역이 없습니다.</p>;
  }
  return (
    <div className="space-y-2">
      {requests.map(r => {
        const p = getProfile(r.user_id);
        const canCancelOwn = onCancel && r.user_id === myProfileId && r.status === 'pending';
        const canAdminCancel = onCancel && isAdmin && (r.status === 'approved' || r.status === 'pending');
        const canCancel = canCancelOwn || canAdminCancel;
        const cancelLabel = r.status === 'approved' ? '승인 취소' : '취소';
        return (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {showOwner && (
                <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{p?.avatar}</AvatarFallback></Avatar>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {showOwner && <span className="font-medium text-sm">{p?.name_kr}</span>}
                  <Badge variant="outline" className={`${LEAVE_TYPE_COLOR[r.leave_type]} text-xs`}>
                    {LEAVE_TYPE_LABEL[r.leave_type]}
                  </Badge>
                  <Badge variant="outline" className={`${STATUS_STYLE[r.status]} text-xs`}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.start_date}{r.start_date !== r.end_date && ` ~ ${r.end_date}`} · {Number(r.days)}일
                  {r.reason && ` · ${r.reason}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canCancel && (
                <Button size="sm" variant="ghost" onClick={() => onCancel!(r.id)}>{cancelLabel}</Button>
              )}
              {isAdmin && onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>휴가 신청 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        {p?.name_kr}님의 {LEAVE_TYPE_LABEL[r.leave_type]} 신청({r.start_date}{r.start_date !== r.end_date && ` ~ ${r.end_date}`})을 삭제합니다. 연결된 결재 및 캘린더 일정도 함께 삭제되며, 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(r)}
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 📊 담당별 연차/월차 사용·잔여 현황표
// ─────────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  ceo: '대표', general_director: '총괄이사', managing_director: '실장', deputy_gm: '부장',
  md: 'MD', designer: '디자이너', assistant_manager: '대리', staff: '사원',
};

function TeamLeaveTable({
  balances, profiles, userRoles, requests, year, onYearChange, myProfileId,
}: {
  balances: any[];
  profiles: any[];
  userRoles: any[];
  requests: any[];
  year: number;
  onYearChange: (y: number) => void;
  myProfileId?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // 해당 연도 신청내역을 담당자별로 묶음 (내 신청 + 전체 신청 통합)
  const reqByUser = useMemo(() => {
    const map = new Map<string, any[]>();
    requests.forEach(r => {
      if (new Date(r.start_date).getFullYear() !== year) return;
      const arr = map.get(r.user_id) || [];
      arr.push(r);
      map.set(r.user_id, arr);
    });
    map.forEach(arr => arr.sort((a, b) => a.start_date.localeCompare(b.start_date)));
    return map;
  }, [requests, year]);

  const rows = useMemo(() => {
    return profiles.map(p => {
      const bal = balances.find(b => b.user_id === p.id);
      const role = userRoles.find(r => r.user_id === p.user_id)?.role;
      const list = reqByUser.get(p.id) || [];

      const sum = (filter: (r: any) => boolean) =>
        list.filter(filter).reduce((s, r) => s + Number(r.days || 0), 0);

      // 연차 차감 대상: 연차·반차·병가 / 월차는 별도 / 여름휴가는 차감 제외
      const isAnnualKind = (r: any) => ['annual', 'half_day', 'sick', 'family_event', 'other'].includes(r.leave_type);
      const approvedAnnual = sum(r => r.status === 'approved' && isAnnualKind(r));
      const approvedMonthly = sum(r => r.status === 'approved' && r.leave_type === 'monthly');
      const pendingDays = sum(r => r.status === 'pending' && r.leave_type !== 'summer');
      const summerDays = sum(r => ['approved', 'pending'].includes(r.status) && r.leave_type === 'summer');

      const total = Number(bal?.total_days ?? 0);
      const mTotal = Number(bal?.monthly_total_days ?? 0);
      const isMonthlyMode = mTotal > 0; // 입사 1년 미만 → 월차 기준
      const used = isMonthlyMode ? 0 : Number(bal?.used_days ?? 0);
      const mUsed = Number(bal?.monthly_used_days ?? 0);

      const baseTotal = isMonthlyMode ? mTotal : total;
      const baseUsed = isMonthlyMode ? mUsed : used;
      const remaining = baseTotal - baseUsed;
      const projected = remaining - pendingDays; // 대기건 승인 시 예상 잔여
      const usageRate = baseTotal > 0 ? Math.min(100, Math.round((baseUsed / baseTotal) * 100)) : 0;

      return {
        profile: p, role, list, isMonthlyMode,
        total, used, mTotal, mUsed,
        baseTotal, baseUsed, remaining, projected,
        approvedAnnual, approvedMonthly, pendingDays, summerDays, usageRate,
      };
    });
  }, [balances, profiles, userRoles, reqByUser]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    total: acc.total + r.baseTotal,
    used: acc.used + r.baseUsed,
    remaining: acc.remaining + r.remaining,
    pending: acc.pending + r.pendingDays,
    summer: acc.summer + r.summerDays,
  }), { total: 0, used: 0, remaining: 0, pending: 0, summer: 0 }), [rows]);

  const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />{year}년 담당별 연차·월차 현황 (신청내역 통합)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => onYearChange(year - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => onYearChange(new Date().getFullYear())}>올해</Button>
          <Button size="icon" variant="outline" onClick={() => onYearChange(year + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 전체 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: '총 적립', value: totals.total, cls: '' },
            { label: '총 사용', value: totals.used, cls: '' },
            { label: '총 잔여', value: totals.remaining, cls: 'text-primary' },
            { label: '승인 대기', value: totals.pending, cls: 'text-warning' },
            { label: '여름휴가', value: totals.summer, cls: 'text-orange-600' },
          ].map(k => (
            <div key={k.label} className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className={`text-xl font-bold ${k.cls}`}>{fmt(k.value)}일</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          담당자 행을 클릭하면 해당 연도의 신청내역(내 신청 · 전체 신청)이 펼쳐집니다. 잔여는 승인건 기준이며, 대기건은 “승인 시 잔여”로 별도 계산됩니다. 여름휴가는 연차에서 차감되지 않습니다.
        </p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>담당자</TableHead>
                <TableHead className="text-center">입사일</TableHead>
                <TableHead className="text-center">적립</TableHead>
                <TableHead className="text-center">사용</TableHead>
                <TableHead className="text-center">잔여</TableHead>
                <TableHead className="text-center">대기</TableHead>
                <TableHead className="text-center">승인 시 잔여</TableHead>
                <TableHead className="text-center">여름휴가</TableHead>
                <TableHead className="text-center">신청</TableHead>
                <TableHead className="w-[160px]">사용률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const barColor = r.remaining <= 2
                  ? 'bg-destructive'
                  : r.usageRate >= 70
                    ? 'bg-warning'
                    : undefined;
                const isOpen = expanded === r.profile.id;
                return (
                  <Fragment key={r.profile.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpanded(isOpen ? null : r.profile.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{r.profile.avatar}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-1">
                              {r.profile.name_kr}
                              {r.profile.id === myProfileId && <Badge variant="outline" className="text-[9px] px-1 py-0">나</Badge>}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {r.role ? (ROLE_LABEL[r.role] ?? r.role) : ''}{r.isMonthlyMode ? ' · 월차 기준' : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{r.profile.hire_date ?? '-'}</TableCell>
                      <TableCell className="text-center">{fmt(r.baseTotal)}일</TableCell>
                      <TableCell className="text-center">{fmt(r.baseUsed)}일</TableCell>
                      <TableCell className={`text-center font-semibold ${r.remaining <= 2 ? 'text-destructive' : 'text-primary'}`}>
                        {fmt(r.remaining)}일
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {r.pendingDays > 0
                          ? <span className="text-warning font-medium">{fmt(r.pendingDays)}일</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className={`text-center text-xs ${r.pendingDays > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {r.pendingDays > 0 ? `${fmt(r.projected)}일` : '-'}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {r.summerDays > 0 ? `${fmt(r.summerDays)}일` : '-'}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{r.list.length}건</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={r.usageRate} className="h-2 flex-1" indicatorClassName={barColor} />
                          <span className="text-xs text-muted-foreground w-9 text-right">{r.usageRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="py-3">
                          {r.list.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-3">{year}년 신청내역이 없습니다.</p>
                          ) : (
                            <div className="space-y-1">
                              {r.list.map(req => (
                                <div key={req.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
                                  <Badge variant="outline" className={LEAVE_TYPE_COLOR[req.leave_type] ?? ''}>
                                    {req.leave_type === 'monthly' ? '월차' : (LEAVE_TYPE_LABEL[req.leave_type] ?? req.leave_type)}
                                  </Badge>
                                  <span className="font-medium">
                                    {req.start_date}{req.end_date !== req.start_date ? ` ~ ${req.end_date}` : ''}
                                  </span>
                                  {req.half_day_period && (
                                    <span className="text-muted-foreground">{req.half_day_period === 'am' ? '오전' : '오후'}</span>
                                  )}
                                  <span className="text-muted-foreground">{fmt(Number(req.days || 0))}일</span>
                                  <Badge variant="outline" className={STATUS_STYLE[req.status] ?? ''}>{STATUS_LABEL[req.status] ?? req.status}</Badge>
                                  {req.reason && <span className="text-muted-foreground truncate max-w-[240px]">· {req.reason}</span>}
                                </div>
                              ))}
                              <div className="pt-2 text-xs text-muted-foreground">
                                승인 합계 — 연차성 {fmt(r.approvedAnnual)}일 / 월차 {fmt(r.approvedMonthly)}일 / 여름휴가 {fmt(r.summerDays)}일
                                {r.pendingDays > 0 && <> · 대기 {fmt(r.pendingDays)}일</>}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">데이터가 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


// ─────────────────────────────────────────────────────────────────────
// 🏖️ 여름휴가 현황 (담당자별 일정 모니터링)
// ─────────────────────────────────────────────────────────────────────
function SummerLeaveOverview({
  requests, profiles, year, onYearChange,
}: {
  requests: any[];
  profiles: any[];
  year: number;
  onYearChange: (y: number) => void;
}) {
  const summerByUser = useMemo(() => {
    const map = new Map<string, any[]>();
    requests.forEach(r => {
      if (r.leave_type !== 'summer') return;
      if (r.status === 'cancelled' || r.status === 'rejected') return;
      const startYear = new Date(r.start_date).getFullYear();
      if (startYear !== year) return;
      const arr = map.get(r.user_id) || [];
      arr.push(r);
      map.set(r.user_id, arr);
    });
    return map;
  }, [requests, year]);

  // 6월 ~ 9월
  const startDate = new Date(year, 5, 1);
  const endDate = new Date(year, 8, 30);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const allReqs = Array.from(summerByUser.values()).flat();
  const totalApproved = allReqs.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.days || 0), 0);
  const totalPending = allReqs.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.days || 0), 0);
  const usersWithLeave = summerByUser.size;

  // 피크일 분석
  const concurrentMap = new Map<string, number>();
  allReqs.forEach(r => {
    if (r.status !== 'approved') return;
    const range = eachDayOfInterval({ start: parseISO(r.start_date), end: parseISO(r.end_date) });
    range.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      concurrentMap.set(key, (concurrentMap.get(key) || 0) + 1);
    });
  });
  const peakDay = Array.from(concurrentMap.entries()).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onYearChange(year - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-bold tabular-nums px-2">{year}년 여름휴가</h3>
          <Button variant="outline" size="icon" onClick={() => onYearChange(year + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300">
            사용자 {usersWithLeave}명
          </Badge>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            승인 {totalApproved}일
          </Badge>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            대기 {totalPending}일
          </Badge>
          {peakDay && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              피크 {format(parseISO(peakDay[0]), 'M/d')} · {peakDay[1]}명
            </Badge>
          )}
        </div>
      </div>

      {/* 직원별 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> 담당자별 여름휴가 타임라인 (6월~9월)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">직원 정보가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* 월 헤더 */}
                <div className="flex border-b border-border pb-2 mb-2">
                  <div className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">담당자</div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                    {[6, 7, 8, 9].map(m => {
                      const monthDays = days.filter(d => d.getMonth() === m - 1).length;
                      return (
                        <div
                          key={m}
                          className="text-center text-xs font-bold text-muted-foreground border-l border-border first:border-l-0"
                          style={{ gridColumn: `span ${monthDays}` }}
                        >
                          {m}월
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 직원별 행 */}
                <div className="space-y-1.5">
                  {profiles.map(p => {
                    const userReqs = summerByUser.get(p.id) || [];
                    const totalDays = userReqs
                      .filter(r => r.status === 'approved')
                      .reduce((s, r) => s + Number(r.days || 0), 0);
                    return (
                      <div key={p.id} className="flex items-center group hover:bg-muted/30 rounded transition-colors py-1">
                        <div className="w-32 shrink-0 flex items-center gap-2 pr-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{p.avatar}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{p.name_kr}</p>
                            {totalDays > 0 && (
                              <p className="text-[10px] text-muted-foreground">{totalDays}일</p>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 relative h-7 bg-muted/30 rounded border border-border">
                          {/* 주말/월구분 음영 */}
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                            {days.map((d, i) => {
                              const isWk = isWeekend(d);
                              const isMonthStart = d.getDate() === 1 && i !== 0;
                              return (
                                <div
                                  key={i}
                                  className={`${isWk ? 'bg-muted/50' : ''} ${isMonthStart ? 'border-l border-border' : ''}`}
                                />
                              );
                            })}
                          </div>
                          {/* 휴가 바 */}
                          {userReqs.map(r => {
                            const reqStart = parseISO(r.start_date);
                            const reqEnd = parseISO(r.end_date);
                            const startIdx = days.findIndex(d => isSameDay(d, reqStart));
                            const endIdx = days.findIndex(d => isSameDay(d, reqEnd));
                            if (startIdx === -1 && endIdx === -1) return null;
                            const s = startIdx === -1 ? 0 : startIdx;
                            const e = endIdx === -1 ? days.length - 1 : endIdx;
                            const span = e - s + 1;
                            const isPending = r.status === 'pending';
                            return (
                              <div
                                key={r.id}
                                className={`absolute top-0.5 bottom-0.5 rounded text-[10px] flex items-center justify-center px-1 font-medium truncate ${
                                  isPending
                                    ? 'bg-warning/30 text-warning border border-warning/40'
                                    : 'bg-orange-500/80 text-white border border-orange-600 dark:bg-orange-600/80'
                                }`}
                                style={{
                                  left: `${(s / days.length) * 100}%`,
                                  width: `${(span / days.length) * 100}%`,
                                }}
                                title={`${r.start_date} ~ ${r.end_date} · ${r.days}일${r.reason ? ' · ' + r.reason : ''}${isPending ? ' (대기)' : ''}`}
                              >
                                {span >= 3 ? `${r.days}일` : ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="mt-4 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-500/80 border border-orange-600" />
                    <span>승인</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-warning/30 border border-warning/40" />
                    <span>대기</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-muted/50 border border-border" />
                    <span>주말</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신청 상세 리스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">신청 상세 ({allReqs.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {allReqs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{year}년 여름휴가 신청 내역이 없습니다.</p>
          ) : (
            <RequestList
              requests={allReqs.slice().sort((a, b) => a.start_date.localeCompare(b.start_date))}
              profiles={profiles}
              showOwner
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
