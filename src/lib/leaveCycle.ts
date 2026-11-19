/** 연차 회기 마감 안내: 마감 전달(마감일 30일 이내)에 표시할 문구를 돌려준다. */
export type LeaveCycle = 'company' | 'hire_anniversary';

export function daysUntil(fiscalEnd: string, today: string): number {
  return Math.round((Date.parse(fiscalEnd) - Date.parse(today)) / 86400000);
}

export function leaveExpiryNotice(opts: {
  cycle: LeaveCycle; fiscalEnd?: string | null; today: string; remaining: number; nextTotal?: number;
}): string | null {
  const { cycle, fiscalEnd, today, remaining } = opts;
  if (!fiscalEnd) return null;
  const d = daysUntil(fiscalEnd, today);
  if (d <= 0 || d > 30) return null;
  const left = Math.max(0, Math.round(remaining * 10) / 10);
  const lastDay = new Date(Date.parse(fiscalEnd) - 86400000).toISOString().slice(0, 10);
  if (cycle === 'company') {
    return `11월은 연차 회기 마감월입니다. 잔여 ${left}일은 ${lastDay}에 소멸되고 12월 1일 ${opts.nextTotal ?? 16}일이 새로 생성됩니다(사규: 이월·수당 없음). 휴가가 몰리지 않도록 부서 담당자와 일정을 미리 공유하고 업무 대행자를 지정해 주세요.`;
  }
  return `연차 회기 마감 D-${d}: 잔여 ${left}일은 ${lastDay}에 소멸됩니다(이월·수당 없음). 사용 계획을 담당자와 미리 공유해 업무 공백이 없도록 해주세요.`;
}
