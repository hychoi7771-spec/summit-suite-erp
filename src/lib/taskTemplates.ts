import { supabase } from '@/integrations/supabase/client';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface TaskTemplate {
  id: string;
  created_by: string;
  name: string;
  title: string;
  description: string | null;
  priority: string;
  category_id: string | null;
  assignee_id: string | null;
  project_name: string | null;
  tags: string[] | null;
  recurrence: Recurrence;
  weekdays: number[] | null;
  month_day: number | null;
  due_offset_days: number;
  is_active: boolean;
  last_generated_date: string | null;
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: '반복 없음 (수동 생성)',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const toISO = (d: Date) => {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
};

/** 오늘 이 템플릿으로 업무를 생성해야 하는지 판단 */
export function isDueToday(tpl: TaskTemplate, today = new Date()): boolean {
  if (!tpl.is_active || tpl.recurrence === 'none') return false;
  const todayISO = toISO(today);
  if (tpl.last_generated_date === todayISO) return false;
  if (tpl.recurrence === 'daily') return true;
  if (tpl.recurrence === 'weekly') return (tpl.weekdays || []).includes(today.getDay());
  if (tpl.recurrence === 'monthly') {
    const day = tpl.month_day || 1;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() === Math.min(day, lastDay);
  }
  return false;
}

export function buildTaskRow(tpl: TaskTemplate, fallbackAssignee?: string | null) {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + (tpl.due_offset_days ?? 0));
  return {
    title: tpl.title,
    description: tpl.description || null,
    priority: tpl.priority as any,
    assignee_id: tpl.assignee_id || fallbackAssignee || null,
    start_date: toISO(today),
    due_date: toISO(due),
    tags: tpl.tags && tpl.tags.length ? tpl.tags : [],
    project_name: tpl.project_name || null,
    category_id: tpl.category_id || null,
    status: 'todo' as any,
  };
}

/** 로그인 사용자의 활성 반복 템플릿 중 오늘 생성 대상을 자동 등록. 생성 건수 반환 */
export async function runDueTemplates(profileId?: string | null): Promise<number> {
  if (!profileId) return 0;
  const { data, error } = await supabase
    .from('task_templates' as any)
    .select('*')
    .eq('created_by', profileId)
    .eq('is_active', true);
  if (error || !data) return 0;

  const due = (data as unknown as TaskTemplate[]).filter(t => isDueToday(t));
  if (!due.length) return 0;

  const todayISO = toISO(new Date());
  let created = 0;
  for (const tpl of due) {
    const { error: insErr } = await supabase.from('tasks').insert(buildTaskRow(tpl, profileId) as any);
    if (insErr) continue;
    await supabase.from('task_templates' as any).update({ last_generated_date: todayISO }).eq('id', tpl.id);
    created += 1;
  }
  return created;
}
