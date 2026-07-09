import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  BarChart3, TrendingUp, Target, Activity, Users, Calendar as CalIcon,
  ClipboardList, Sparkles, Plus, ShieldAlert, ArrowUpRight, ArrowDownRight, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Line, LabelList,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const fmtKRW = (n: number) => {
  if (!n) return '₩0';
  if (Math.abs(n) >= 1_000_000) return `₩${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₩${(n / 1_000).toFixed(0)}K`;
  return `₩${n}`;
};
const pct = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(1)}%`);
const achColor = (a: number | null) => (a == null ? 'bg-muted' : a >= 90 ? 'bg-emerald-500' : a >= 70 ? 'bg-amber-400' : 'bg-rose-500');
const achText = (a: number | null) => (a == null ? 'text-muted-foreground' : a >= 90 ? 'text-emerald-600' : a >= 70 ? 'text-amber-600' : 'text-rose-600');

interface MDRow { md_name: string; year_month: string; target_revenue: number; target_profit: number; channel_count: number; note?: string; growth_rate?: number; actual_revenue: number; actual_profit: number; revenue_achievement_pct: number | null; profit_achievement_pct: number | null; profit_rate_pct: number | null; }
interface ChRow { id: string; md_name: string; channel_name: string; year_month: string; target_revenue: number; target_profit: number; actual_revenue: number | null; actual_profit: number | null; note?: string; }
interface Meeting { id: string; meeting_date: string; title?: string; attendees?: string; highlights: string[]; season_calendar: { label: string; date: string; dday?: string }[]; weather_note?: string; channel_review?: string; inventory_review?: string; event_review?: string; marketing_review?: string; md_review?: string; checklist: { owner: string; action: string; due: string }[]; ai_summary?: string; }

const MONTHS = ['2026-06', '2026-07'];

export default function Sales() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const isAllowed = ['ceo', 'general_director', 'managing_director'].includes(userRole || '');

  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState('2026-07');
  const [mdSummary, setMdSummary] = useState<MDRow[]>([]);
  const [channels, setChannels] = useState<ChRow[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: sum }, { data: ch }, { data: mt }] = await Promise.all([
      supabase.from('v_sales_md_summary').select('*').order('md_name'),
      supabase.from('sales_channel_actuals').select('*').order('md_name'),
      supabase.from('weekly_sales_meetings').select('*').order('meeting_date', { ascending: false }),
    ]);
    setMdSummary((sum || []) as any);
    setChannels((ch || []) as any);
    setMeetings((mt || []) as any);
    setLoading(false);
  };

  useEffect(() => { if (isAllowed) load(); else setLoading(false); }, [isAllowed]);

  if (!isAllowed) {
    return (
      <div className="p-6">
        <PageHeader icon={ShieldAlert} title="영업관리" description="접근 권한 필요" tone="rose" />
        <Card className="mt-6"><CardContent className="p-10 text-center text-sm text-muted-foreground">
          이 메뉴는 <b>대표·경영관리</b> 권한만 열람할 수 있습니다.
        </CardContent></Card>
      </div>
    );
  }
  if (loading) return <PageSkeleton variant="dashboard" />;

  const monthSummary = mdSummary.filter(m => m.year_month === ym);
  const totalTarget = monthSummary.reduce((a, b) => a + Number(b.target_revenue), 0);
  const totalActual = monthSummary.reduce((a, b) => a + Number(b.actual_revenue || 0), 0);
  const totalProfit = monthSummary.reduce((a, b) => a + Number(b.actual_profit || 0), 0);
  const groupAch = totalTarget > 0 ? (totalActual / totalTarget * 100) : null;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader
        icon={BarChart3}
        title="영업관리"
        description="담당 MD별 목표 대비 실적 · 채널 현황 · 주간 영업회의"
        tone="rose"
        actions={
          <div className="flex items-center gap-2">
            <Select value={ym} onValueChange={setYm}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="dashboard" className="gap-1.5"><TrendingUp className="h-4 w-4" />대시보드</TabsTrigger>
          <TabsTrigger value="md" className="gap-1.5"><Users className="h-4 w-4" />MD별 상세</TabsTrigger>
          <TabsTrigger value="meeting" className="gap-1.5"><ClipboardList className="h-4 w-4" />주간회의</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><Plus className="h-4 w-4" />데이터 입력</TabsTrigger>
        </TabsList>

        {/* -------------------- ① 대시보드 -------------------- */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={`${ym} 총 목표`} value={fmtKRW(totalTarget)} icon={Target} tone="blue" />
            <StatCard label="총 실적" value={fmtKRW(totalActual)} icon={TrendingUp} tone="emerald" />
            <StatCard label="총 이익" value={fmtKRW(totalProfit)} icon={Activity} tone="violet" />
            <StatCard label="그룹 달성률" value={pct(groupAch)} icon={CheckCircle2} tone={groupAch && groupAch >= 90 ? 'emerald' : groupAch && groupAch >= 70 ? 'amber' : 'rose'} />
          </div>

          {/* MD 불릿차트 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> MD별 목표 vs 실적 · 이익률
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {monthSummary.length === 0 ? (
                  <EmptyState icon={BarChart3} title="데이터 없음" description="이번 달 등록된 MD 목표가 없습니다." />
                ) : (
                  <ResponsiveContainer>
                    <ComposedChart data={monthSummary.map(m => ({
                      md: m.md_name,
                      target: Number(m.target_revenue) / 1_000_000,
                      actual: Number(m.actual_revenue || 0) / 1_000_000,
                      profitRate: Number(m.profit_rate_pct || 0),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,90%)" />
                      <XAxis dataKey="md" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tickFormatter={v => `₩${v}M`} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, k: string) => k === 'profitRate' ? `${v}%` : `₩${v.toFixed(1)}M`} />
                      <Bar yAxisId="left" dataKey="target" fill="hsl(210,20%,85%)" radius={[4, 4, 0, 0]} name="목표" />
                      <Bar yAxisId="left" dataKey="actual" fill="hsl(210,90%,50%)" radius={[4, 4, 0, 0]} name="실적">
                        <LabelList dataKey="actual" position="top" formatter={(v: number) => `₩${v.toFixed(1)}M`} style={{ fontSize: 10, fill: 'hsl(210,90%,40%)' }} />
                      </Bar>
                      <Line yAxisId="right" dataKey="profitRate" stroke="hsl(280,70%,55%)" strokeWidth={2} name="이익률(%)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* MD 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {monthSummary.map(m => (
              <Card key={m.md_name} className="hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{m.md_name}</CardTitle>
                    <Badge variant="outline">{m.channel_count}채널</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>매출 달성률</span>
                      <span className={`font-bold ${achText(m.revenue_achievement_pct)}`}>{pct(m.revenue_achievement_pct)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div className={`h-full ${achColor(m.revenue_achievement_pct)}`} style={{ width: `${Math.min(m.revenue_achievement_pct || 0, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">{fmtKRW(Number(m.actual_revenue || 0))}</span>
                      <span className="text-muted-foreground">/ {fmtKRW(Number(m.target_revenue))}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/40">
                      <div className="text-muted-foreground">이익</div>
                      <div className="font-semibold">{fmtKRW(Number(m.actual_profit || 0))}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/40">
                      <div className="text-muted-foreground">이익률</div>
                      <div className="font-semibold">{pct(m.profit_rate_pct)}</div>
                    </div>
                  </div>
                  {m.note && <p className="text-xs text-muted-foreground line-clamp-2">{m.note}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 저달성 TOP 5 채널 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-rose-500" /> 저달성 채널 TOP 5 ({ym})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UnderperformList channels={channels.filter(c => c.year_month === ym)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- ② MD별 상세 -------------------- */}
        <TabsContent value="md">
          <MDDetailTab channels={channels} ym={ym} />
        </TabsContent>

        {/* -------------------- ③ 주간회의 -------------------- */}
        <TabsContent value="meeting">
          <MeetingTab meetings={meetings} onReload={load} />
        </TabsContent>

        {/* -------------------- ④ 데이터 입력 -------------------- */}
        <TabsContent value="entry">
          <EntryTab onReload={load} channels={channels} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ 서브 컴포넌트 ============ */
function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: any = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    violet: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    rose: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  };
  return (
    <Card className="stat-card">
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${tones[tone] || 'bg-muted'}`}><Icon className="h-4 w-4" /></div>
      </CardContent>
    </Card>
  );
}

function UnderperformList({ channels }: { channels: ChRow[] }) {
  const rows = channels
    .filter(c => Number(c.target_revenue) > 0 && c.actual_revenue != null)
    .map(c => ({
      ...c,
      ach: (Number(c.actual_revenue) / Number(c.target_revenue)) * 100,
      gap: Number(c.target_revenue) - Number(c.actual_revenue),
    }))
    .sort((a, b) => a.ach - b.ach)
    .slice(0, 5);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">데이터 없음</p>;
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg border">
          <Badge variant="outline" className="shrink-0">{r.md_name}</Badge>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate">{r.channel_name}</span>
              <span className={`font-bold ${achText(r.ach)}`}>{r.ach.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div className={`h-full ${achColor(r.ach)}`} style={{ width: `${Math.min(r.ach, 100)}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {fmtKRW(Number(r.actual_revenue))} / {fmtKRW(Number(r.target_revenue))} · 갭 {fmtKRW(r.gap)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MDDetailTab({ channels, ym }: { channels: ChRow[]; ym: string }) {
  const mds = Array.from(new Set(channels.map(c => c.md_name)));
  const [md, setMd] = useState(mds[0] || '');
  useEffect(() => { if (!md && mds[0]) setMd(mds[0]); }, [mds]);
  const rows = channels
    .filter(c => c.md_name === md && c.year_month === ym)
    .sort((a, b) => Number(b.target_revenue) - Number(a.target_revenue));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {mds.map(m => (
          <Button key={m} size="sm" variant={m === md ? 'default' : 'outline'} onClick={() => setMd(m)}>{m}</Button>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{md} · {ym} · 채널별 목표 vs 실적</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={Users} title="데이터 없음" description="선택된 MD의 채널 데이터가 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2">채널</th>
                    <th className="text-right py-2 px-2">목표매출</th>
                    <th className="text-right py-2 px-2">실적매출</th>
                    <th className="text-right py-2 px-2">달성률</th>
                    <th className="text-right py-2 px-2">실적이익</th>
                    <th className="text-right py-2 px-2">이익률</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const tgt = Number(r.target_revenue);
                    const act = Number(r.actual_revenue || 0);
                    const prof = Number(r.actual_profit || 0);
                    const ach = tgt > 0 ? (act / tgt) * 100 : null;
                    const pr = act > 0 ? (prof / act) * 100 : null;
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{r.channel_name}</td>
                        <td className="text-right py-2 px-2 tabular-nums">{fmtKRW(tgt)}</td>
                        <td className="text-right py-2 px-2 tabular-nums">{fmtKRW(act)}</td>
                        <td className={`text-right py-2 px-2 font-semibold tabular-nums ${achText(ach)}`}>{pct(ach)}</td>
                        <td className="text-right py-2 px-2 tabular-nums">{fmtKRW(prof)}</td>
                        <td className="text-right py-2 px-2 tabular-nums text-muted-foreground">{pct(pr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MeetingTab({ meetings, onReload }: { meetings: Meeting[]; onReload: () => void }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Meeting | null>(meetings[0] || null);
  const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => { if (!selected && meetings[0]) setSelected(meetings[0]); }, [meetings]);

  const askAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const items = [{
        id: selected.id,
        title: selected.title || `${selected.meeting_date} 회의`,
        summary: [
          '핵심3: ' + selected.highlights.join(' / '),
          '채널: ' + (selected.channel_review || ''),
          '재고: ' + (selected.inventory_review || ''),
          '행사: ' + (selected.event_review || ''),
          '체크리스트: ' + selected.checklist.map(c => `${c.owner}-${c.action}(${c.due})`).join(' / '),
        ].join('\n'),
        category: '주간영업회의',
      }];
      const { data, error } = await supabase.functions.invoke('summarize-assets', {
        body: { source: 'approvals', items },
      });
      if (error) throw error;
      const summary = [data?.overview, ...(data?.patterns || []).map((p: string) => '• ' + p), ...(data?.recommendations || []).map((p: string) => '➜ ' + p)].filter(Boolean).join('\n\n');
      await supabase.from('weekly_sales_meetings').update({ ai_summary: summary }).eq('id', selected.id);
      toast({ title: 'AI 요약 완료' });
      onReload();
    } catch (e: any) {
      toast({ title: 'AI 요약 실패', description: e.message, variant: 'destructive' });
    } finally { setAiLoading(false); }
  };

  const createTasks = async () => {
    if (!selected) return;
    try {
      // profiles 조회로 owner name → profile id 매핑
      const { data: profs } = await supabase.from('profiles').select('id, name_kr, name');
      const rows = selected.checklist.map(c => {
        const p = profs?.find((x: any) => x.name_kr === c.owner || x.name === c.owner);
        return {
          title: `[영업회의 ${selected.meeting_date}] ${c.action}`,
          description: `담당: ${c.owner}\n기한: ${c.due}`,
          status: 'todo',
          priority: 'high',
          due_date: c.due,
          assignee_id: p?.id || null,
          tags: ['영업회의'],
        };
      }).filter(r => r.assignee_id);
      if (rows.length === 0) return toast({ title: '매칭되는 담당자 없음', variant: 'destructive' });
      const { error } = await supabase.from('tasks').insert(rows as any);
      if (error) throw error;
      toast({ title: `${rows.length}건 업무 생성 완료` });
    } catch (e: any) {
      toast({ title: '업무 생성 실패', description: e.message, variant: 'destructive' });
    }
  };

  if (meetings.length === 0) {
    return <EmptyState title="등록된 회의가 없습니다" description="'데이터 입력' 탭에서 주간회의를 추가하세요." icon={ClipboardList} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
      <div className="space-y-1">
        {meetings.map(m => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className={`w-full text-left p-3 rounded-lg border ${selected?.id === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40'}`}
          >
            <div className="text-sm font-semibold">{m.meeting_date}</div>
            <div className="text-xs opacity-80 truncate">{m.title}</div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg">{selected.title || selected.meeting_date}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{selected.attendees}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={askAI} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />{aiLoading ? '분석중...' : 'AI 요약'}
                </Button>
                <Button size="sm" onClick={createTasks}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />업무로 발행</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> 이번 주 핵심 {selected.highlights?.length || 0}가지
                </h4>
                <div className="space-y-2">
                  {selected.highlights?.map((h, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 text-sm">
                      <span className="font-bold text-amber-700 dark:text-amber-400">{i + 1}.</span> {h}
                    </div>
                  ))}
                </div>
              </section>

              {selected.season_calendar?.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5"><CalIcon className="h-4 w-4" /> 시즌 캘린더</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selected.season_calendar.map((s, i) => {
                      const days = Math.round((new Date(s.date).getTime() - Date.now()) / 86400000);
                      return (
                        <div key={i} className="p-2 rounded-lg border text-xs">
                          <div className="font-semibold">{s.label}</div>
                          <div className="text-muted-foreground">{s.date}</div>
                          <Badge variant={days < 0 ? 'secondary' : days <= 3 ? 'destructive' : 'outline'} className="mt-1 text-[10px]">
                            {days < 0 ? `D+${Math.abs(days)}` : days === 0 ? 'D-Day' : `D-${days}`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {selected.weather_note && (
                <section className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200/50 text-xs">
                  🌦️ {selected.weather_note}
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['채널 관점', selected.channel_review],
                  ['재고 관점', selected.inventory_review],
                  ['행사 관점', selected.event_review],
                  ['마케팅 관점', selected.marketing_review],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="p-3 rounded-lg border">
                    <h5 className="text-xs font-bold uppercase text-muted-foreground mb-1">{k}</h5>
                    <p className="text-sm whitespace-pre-wrap">{v as string}</p>
                  </div>
                ))}
              </div>

              {selected.checklist?.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 담당자별 액션 체크리스트</h4>
                  <div className="space-y-1">
                    {selected.checklist.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded border text-sm">
                        <Badge variant="outline" className="shrink-0">{c.owner}</Badge>
                        <span className="flex-1">{c.action}</span>
                        <span className="text-xs text-muted-foreground">~ {c.due}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selected.ai_summary && (
                <section className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50">
                  <h5 className="text-xs font-bold uppercase text-violet-700 dark:text-violet-400 mb-1 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI 인사이트</h5>
                  <p className="text-sm whitespace-pre-wrap">{selected.ai_summary}</p>
                </section>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function EntryTab({ onReload, channels }: { onReload: () => void; channels: ChRow[] }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<'channel' | 'md' | 'meeting'>('channel');
  const [chForm, setChForm] = useState({ md_name: '공경미', channel_name: '', year_month: '2026-07', target_revenue: '', target_profit: '', actual_revenue: '', actual_profit: '' });
  const [mdForm, setMdForm] = useState({ md_name: '공경미', year_month: '2026-07', target_revenue: '', target_profit: '', channel_count: '', note: '' });
  const [mtForm, setMtForm] = useState({ meeting_date: '', title: '', attendees: '', highlights: '', weather_note: '', channel_review: '', inventory_review: '', event_review: '', marketing_review: '', checklist: '' });

  const saveChannel = async () => {
    const { error } = await supabase.from('sales_channel_actuals').upsert({
      md_name: chForm.md_name,
      channel_name: chForm.channel_name,
      year_month: chForm.year_month,
      target_revenue: Number(chForm.target_revenue) || 0,
      target_profit: Number(chForm.target_profit) || 0,
      actual_revenue: chForm.actual_revenue === '' ? null : Number(chForm.actual_revenue),
      actual_profit: chForm.actual_profit === '' ? null : Number(chForm.actual_profit),
    }, { onConflict: 'md_name,channel_name,year_month' });
    if (error) return toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    toast({ title: '채널 데이터 저장 완료' });
    setChForm({ ...chForm, channel_name: '', target_revenue: '', target_profit: '', actual_revenue: '', actual_profit: '' });
    onReload();
  };
  const saveMD = async () => {
    const { error } = await supabase.from('sales_md_targets').upsert({
      md_name: mdForm.md_name, year_month: mdForm.year_month,
      target_revenue: Number(mdForm.target_revenue) || 0,
      target_profit: Number(mdForm.target_profit) || 0,
      channel_count: Number(mdForm.channel_count) || 0,
      note: mdForm.note || null,
    } as any, { onConflict: 'md_name,year_month' });
    if (error) return toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    toast({ title: 'MD 목표 저장 완료' });
    onReload();
  };
  const saveMeeting = async () => {
    const parseList = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
    const parseChecklist = (s: string) => s.split('\n').filter(l => l.trim()).map(l => {
      const [owner, action, due] = l.split('|').map(x => x?.trim() || '');
      return { owner, action, due };
    });
    const { error } = await supabase.from('weekly_sales_meetings').upsert({
      meeting_date: mtForm.meeting_date,
      title: mtForm.title || null,
      attendees: mtForm.attendees || null,
      highlights: parseList(mtForm.highlights),
      weather_note: mtForm.weather_note || null,
      channel_review: mtForm.channel_review || null,
      inventory_review: mtForm.inventory_review || null,
      event_review: mtForm.event_review || null,
      marketing_review: mtForm.marketing_review || null,
      checklist: parseChecklist(mtForm.checklist),
    } as any, { onConflict: 'meeting_date' });
    if (error) return toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    toast({ title: '주간회의 저장 완료' });
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === 'channel' ? 'default' : 'outline'} onClick={() => setTab('channel')}>채널 데이터</Button>
        <Button size="sm" variant={tab === 'md' ? 'default' : 'outline'} onClick={() => setTab('md')}>MD 월간 목표</Button>
        <Button size="sm" variant={tab === 'meeting' ? 'default' : 'outline'} onClick={() => setTab('meeting')}>주간회의</Button>
      </div>

      {tab === 'channel' && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>MD</Label><Input value={chForm.md_name} onChange={e => setChForm({ ...chForm, md_name: e.target.value })} /></div>
            <div><Label>채널명</Label><Input value={chForm.channel_name} onChange={e => setChForm({ ...chForm, channel_name: e.target.value })} /></div>
            <div><Label>월 (YYYY-MM)</Label><Input value={chForm.year_month} onChange={e => setChForm({ ...chForm, year_month: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><Label>목표매출</Label><Input type="number" value={chForm.target_revenue} onChange={e => setChForm({ ...chForm, target_revenue: e.target.value })} /></div>
            <div><Label>목표이익</Label><Input type="number" value={chForm.target_profit} onChange={e => setChForm({ ...chForm, target_profit: e.target.value })} /></div>
            <div><Label>실적매출</Label><Input type="number" value={chForm.actual_revenue} onChange={e => setChForm({ ...chForm, actual_revenue: e.target.value })} /></div>
            <div><Label>실적이익</Label><Input type="number" value={chForm.actual_profit} onChange={e => setChForm({ ...chForm, actual_profit: e.target.value })} /></div>
          </div>
          <Button onClick={saveChannel} disabled={!chForm.channel_name}>저장</Button>
        </CardContent></Card>
      )}
      {tab === 'md' && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>MD</Label><Input value={mdForm.md_name} onChange={e => setMdForm({ ...mdForm, md_name: e.target.value })} /></div>
            <div><Label>월</Label><Input value={mdForm.year_month} onChange={e => setMdForm({ ...mdForm, year_month: e.target.value })} /></div>
            <div><Label>채널 수</Label><Input type="number" value={mdForm.channel_count} onChange={e => setMdForm({ ...mdForm, channel_count: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>목표매출</Label><Input type="number" value={mdForm.target_revenue} onChange={e => setMdForm({ ...mdForm, target_revenue: e.target.value })} /></div>
            <div><Label>목표이익</Label><Input type="number" value={mdForm.target_profit} onChange={e => setMdForm({ ...mdForm, target_profit: e.target.value })} /></div>
          </div>
          <div><Label>비고</Label><Textarea value={mdForm.note} onChange={e => setMdForm({ ...mdForm, note: e.target.value })} /></div>
          <Button onClick={saveMD}>저장</Button>
        </CardContent></Card>
      )}
      {tab === 'meeting' && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>회의일</Label><Input type="date" value={mtForm.meeting_date} onChange={e => setMtForm({ ...mtForm, meeting_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>제목</Label><Input value={mtForm.title} onChange={e => setMtForm({ ...mtForm, title: e.target.value })} /></div>
          </div>
          <div><Label>참석자</Label><Input value={mtForm.attendees} onChange={e => setMtForm({ ...mtForm, attendees: e.target.value })} /></div>
          <div><Label>이번 주 핵심 (줄바꿈으로 구분)</Label><Textarea rows={3} value={mtForm.highlights} onChange={e => setMtForm({ ...mtForm, highlights: e.target.value })} /></div>
          <div><Label>날씨/시장 메모</Label><Textarea rows={2} value={mtForm.weather_note} onChange={e => setMtForm({ ...mtForm, weather_note: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>채널 관점</Label><Textarea rows={3} value={mtForm.channel_review} onChange={e => setMtForm({ ...mtForm, channel_review: e.target.value })} /></div>
            <div><Label>재고 관점</Label><Textarea rows={3} value={mtForm.inventory_review} onChange={e => setMtForm({ ...mtForm, inventory_review: e.target.value })} /></div>
            <div><Label>행사 관점</Label><Textarea rows={3} value={mtForm.event_review} onChange={e => setMtForm({ ...mtForm, event_review: e.target.value })} /></div>
            <div><Label>마케팅 관점</Label><Textarea rows={3} value={mtForm.marketing_review} onChange={e => setMtForm({ ...mtForm, marketing_review: e.target.value })} /></div>
          </div>
          <div>
            <Label>액션 체크리스트 (한 줄당: <code>담당자 | 액션 | YYYY-MM-DD</code>)</Label>
            <Textarea rows={4} value={mtForm.checklist} onChange={e => setMtForm({ ...mtForm, checklist: e.target.value })} placeholder="공경미 | 11번가 쇼킹딜 참여 주기 단축 제안 | 2026-07-11" />
          </div>
          <Button onClick={saveMeeting} disabled={!mtForm.meeting_date}>저장</Button>
        </CardContent></Card>
      )}
    </div>
  );
}
