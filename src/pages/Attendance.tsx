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
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek, isSameMonth, parseISO, isWithinInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { LeaveRequestDialog } from '@/components/attendance/LeaveRequestDialog';
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
  const isAdmin = isManager; // 부장급 이상이 근태 관리 가능

  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());

  const ROLE_ORDER: Record<string, number> = {
    ceo: 0, general_director: 1, deputy_gm: 2, md: 3, designer: 4, staff: 5,
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
    const { error } = await supabase.rpc('run_monthly_leave_grant');
    if (error) { toast({ title: '재계산 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '휴가 적립 자동 재계산 완료' });
    fetchData();
  };

  const updateHireDate = async (profileId: string, date: string) => {
    const { error } = await supabase.from('profiles').update({ hire_date: date || null }).eq('id', profileId);
    if (error) { toast({ title: '입사일 저장 실패', description: error.message, variant: 'destructive' }); return; }
    await supabase.rpc('calculate_leave_grant', { _profile_id: profileId, _today: format(new Date(), 'yyyy-MM-dd') });
    toast({ title: '입사일 업데이트 및 휴가 재계산 완료' });
    fetchData();
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_balances' }, fetchData)
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
    fetchData();
  };

  const cancelMyRequest = async (id: string) => {
    const { error } = await supabase.from('leave_requests')
      .update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast({ title: '취소 실패', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '신청이 취소되었습니다' });
    fetchData();
  };

  const myRequests = requests.filter(r => r.user_id === profile?.id);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">근태관리</h1>
          <p className="text-sm text-muted-foreground">휴가 신청 · 승인 현황 · 남은 휴가를 한눈에 관리하세요.</p>
        </div>
        <Button onClick={() => setShowRequest(true)} className="gap-2">
          <Plus className="h-4 w-4" /> 휴가 신청
        </Button>
      </div>

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
        <TabsList>
          <TabsTrigger value="calendar">월별 캘린더</TabsTrigger>
          <TabsTrigger value="balances">My 연차</TabsTrigger>
          <TabsTrigger value="my">내 신청 내역</TabsTrigger>
          <TabsTrigger value="all">전체 신청</TabsTrigger>
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

        {/* 연차 잔여 */}
        <TabsContent value="balances" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{year}년 휴가 대시보드</CardTitle>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={recalculateAll}>자동 재계산</Button>
                )}
                <Button size="icon" variant="outline" onClick={() => setYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium w-16 text-center">{year}년</span>
                <Button size="icon" variant="outline" onClick={() => setYear(y => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>멤버</TableHead>
                    <TableHead className="text-center">입사일</TableHead>
                    <TableHead className="text-right">연차 적립</TableHead>
                    <TableHead className="text-right">월차 적립</TableHead>
                    <TableHead className="text-right">사용</TableHead>
                    <TableHead className="text-right">남은 휴가</TableHead>
                    <TableHead className="text-center">다음 적립일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => {
                    const bal = balanceFor(p.id);
                    const annual = Number(bal?.total_days ?? 0);
                    const monthly = Number(bal?.monthly_total_days ?? 0);
                    const total = annual + monthly;
                    const used = Number(bal?.used_days ?? 0);
                    const remaining = total - used;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{p.avatar}</AvatarFallback></Avatar>
                            <span className="font-medium">{p.name_kr}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {isAdmin ? (
                            <Input
                              type="date"
                              defaultValue={p.hire_date || ''}
                              className="w-36 h-8 text-xs mx-auto"
                              onBlur={e => {
                                if (e.target.value !== (p.hire_date || '')) updateHireDate(p.id, e.target.value);
                              }}
                            />
                          ) : (p.hire_date ? format(parseISO(p.hire_date), 'yyyy.MM.dd') : '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin ? (
                            <Input
                              type="number" step="0.5" defaultValue={annual}
                              className="w-20 h-8 text-right ml-auto"
                              onBlur={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v !== annual) updateBalance(p.id, v);
                              }}
                            />
                          ) : `${annual}일`}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{monthly > 0 ? `${monthly}일` : '-'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{used}일</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${remaining < 3 ? 'text-destructive' : 'text-foreground'}`}>{remaining}일</span>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {bal?.next_grant_date ? format(parseISO(bal.next_grant_date), 'yyyy.MM.dd') : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {isAdmin && (
                <p className="text-xs text-muted-foreground mt-3">
                  💡 입사일/연차 적립 칸을 클릭해 수정. '자동 재계산'으로 입사일 기준 월차(1년 미만)/연차(1년 이상)를 일괄 갱신합니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 사용 일자 상세표 (이미지 형식) */}
          <Card>
            <CardHeader><CardTitle className="text-base">{year}년 휴가 사용 내역</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">성명</TableHead>
                    <TableHead className="w-[80px]">구분</TableHead>
                    <TableHead>사용 일자</TableHead>
                    <TableHead className="text-right w-[80px]">합계</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => {
                    const myReqs = requests.filter(r =>
                      r.user_id === p.id && r.status === 'approved'
                      && new Date(r.start_date).getFullYear() === year,
                    );
                    const annualReqs = myReqs.filter(r => r.leave_type === 'annual' || r.leave_type === 'sick');
                    const halfReqs = myReqs.filter(r => r.leave_type === 'half_day');
                    const annualSum = annualReqs.reduce((s, r) => s + Number(r.days), 0);
                    const halfSum = halfReqs.reduce((s, r) => s + Number(r.days), 0);
                    return (
                      <Fragment key={p.id}>
                        <TableRow>
                          <TableCell rowSpan={2} className="font-medium align-middle">{p.name_kr}</TableCell>
                          <TableCell className="text-xs">연차</TableCell>
                          <TableCell className="text-xs">
                            {annualReqs.length > 0
                              ? annualReqs.map(r => format(parseISO(r.start_date), 'yyyy.MM.dd')).join(', ')
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right text-xs">{annualSum > 0 ? `${annualSum}일` : '-'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-xs">반차</TableCell>
                          <TableCell className="text-xs">
                            {halfReqs.length > 0
                              ? halfReqs.map(r => format(parseISO(r.start_date), 'yyyy.MM.dd')).join(', ')
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right text-xs">{halfSum > 0 ? `${halfSum}일` : '-'}</TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
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
              <RequestList requests={requests} profiles={profiles} showOwner myProfileId={profile?.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog open={showRequest} onOpenChange={setShowRequest} onCreated={fetchData} />
    </div>
  );
}

function RequestList({
  requests, profiles, showOwner, onCancel, myProfileId,
}: {
  requests: any[];
  profiles: any[];
  showOwner: boolean;
  onCancel?: (id: string) => void;
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
        const canCancel = onCancel && r.user_id === myProfileId && r.status === 'pending';
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
            {canCancel && (
              <Button size="sm" variant="ghost" onClick={() => onCancel!(r.id)}>취소</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
