import { supabase } from '@/integrations/supabase/client';
import { format, getDay, getDate } from 'date-fns';

export type RoutineFrequency = 'daily' | 'weekly' | 'monthly';
export type RoutineTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type RoutineCompletionStatus = 'pending' | 'done' | 'carry_over' | 'skipped';

export interface RoutineTemplate {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: RoutineFrequency;
  weekdays: number[] | null;
  month_day: number | null;
  estimated_minutes: number;
  time_of_day: RoutineTimeOfDay;
  category: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoutineCompletion {
  id: string;
  template_id: string;
  user_id: string;
  date: string;
  status: RoutineCompletionStatus;
  skip_reason: string | null;
  completed_at: string | null;
}

export const TIME_OF_DAY_LABELS: Record<RoutineTimeOfDay, string> = {
  morning: '🌅 오전',
  afternoon: '☀️ 오후',
  evening: '🌙 저녁',
  anytime: '⏱ 언제든',
};

export const FREQUENCY_LABELS: Record<RoutineFrequency, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export const STATUS_CONFIG: Record<RoutineCompletionStatus, { label: string; emoji: string; className: string }> = {
  pending: { label: '대기', emoji: '⏳', className: 'bg-muted text-muted-foreground' },
  done: { label: '완료', emoji: '✓', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  carry_over: { label: '이월', emoji: '↻', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  skipped: { label: '스킵', emoji: '✗', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
};

/** 해당 날짜에 적용되는 루틴인지 판단 */
export function isRoutineForDate(template: RoutineTemplate, date: Date): boolean {
  if (!template.is_active) return false;
  if (template.frequency === 'daily') return true;
  if (template.frequency === 'weekly') {
    const day = getDay(date);
    return (template.weekdays || []).includes(day);
  }
  if (template.frequency === 'monthly') {
    return template.month_day === getDate(date);
  }
  return false;
}

/** 특정 사용자의 특정 날짜 루틴 목록 + 완료 기록 가져오기 */
export async function fetchRoutinesForDate(userId: string, date: string) {
  const [tplRes, compRes] = await Promise.all([
    supabase
      .from('routine_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('routine_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date),
  ]);

  const templates = (tplRes.data as RoutineTemplate[]) || [];
  const completions = (compRes.data as RoutineCompletion[]) || [];
  const targetDate = new Date(date + 'T00:00:00');
  const applicable = templates.filter(t => isRoutineForDate(t, targetDate));

  return applicable.map(template => {
    const completion = completions.find(c => c.template_id === template.id);
    return { template, completion };
  });
}

/** 루틴 완료 기록을 upsert */
export async function upsertRoutineCompletion(
  templateId: string,
  userId: string,
  date: string,
  status: RoutineCompletionStatus,
  skipReason?: string,
) {
  const completedAt = status === 'done' ? new Date().toISOString() : null;
  return supabase
    .from('routine_completions')
    .upsert(
      {
        template_id: templateId,
        user_id: userId,
        date,
        status,
        skip_reason: skipReason || null,
        completed_at: completedAt,
      },
      { onConflict: 'template_id,date' },
    );
}

/** 오늘의 루틴이 daily report 와 별도로 모두 처리됐는지 (체크아웃용) */
export function summarizeRoutineCompletions(items: { completion?: RoutineCompletion }[]) {
  const total = items.length;
  const done = items.filter(i => i.completion?.status === 'done').length;
  const carry = items.filter(i => i.completion?.status === 'carry_over').length;
  const skipped = items.filter(i => i.completion?.status === 'skipped').length;
  const pending = total - done - carry - skipped;
  return { total, done, carry, skipped, pending };
}

/** 주간 루틴 완수율 — 직원별 */
export async function fetchWeeklyRoutineStats(startDate: string, endDate: string) {
  const [tplRes, compRes] = await Promise.all([
    supabase.from('routine_templates').select('*').eq('is_active', true),
    supabase
      .from('routine_completions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate),
  ]);
  return {
    templates: (tplRes.data as RoutineTemplate[]) || [],
    completions: (compRes.data as RoutineCompletion[]) || [],
  };
}

export function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}
