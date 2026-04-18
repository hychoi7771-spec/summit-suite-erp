// 한국 국경일/공휴일 (양력 고정 + 주요 대체공휴일 수동 매핑)
// 음력 기반 공휴일은 연도별로 직접 매핑합니다.

const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '크리스마스' },
];

// 음력 기반/대체공휴일 (연도별)
const LUNAR_HOLIDAYS: Record<number, { date: string; name: string }[]> = {
  2024: [
    { date: '2024-02-09', name: '설날 연휴' },
    { date: '2024-02-10', name: '설날' },
    { date: '2024-02-11', name: '설날 연휴' },
    { date: '2024-02-12', name: '설날 대체공휴일' },
    { date: '2024-04-10', name: '국회의원선거' },
    { date: '2024-05-15', name: '부처님오신날' },
    { date: '2024-09-16', name: '추석 연휴' },
    { date: '2024-09-17', name: '추석' },
    { date: '2024-09-18', name: '추석 연휴' },
  ],
  2025: [
    { date: '2025-01-28', name: '설날 연휴' },
    { date: '2025-01-29', name: '설날' },
    { date: '2025-01-30', name: '설날 연휴' },
    { date: '2025-05-05', name: '어린이날/부처님오신날' },
    { date: '2025-05-06', name: '대체공휴일' },
    { date: '2025-10-03', name: '개천절' },
    { date: '2025-10-05', name: '추석 연휴' },
    { date: '2025-10-06', name: '추석' },
    { date: '2025-10-07', name: '추석 연휴' },
    { date: '2025-10-08', name: '대체공휴일' },
  ],
  2026: [
    { date: '2026-02-16', name: '설날 연휴' },
    { date: '2026-02-17', name: '설날' },
    { date: '2026-02-18', name: '설날 연휴' },
    { date: '2026-05-24', name: '부처님오신날' },
    { date: '2026-05-25', name: '대체공휴일' },
    { date: '2026-09-24', name: '추석 연휴' },
    { date: '2026-09-25', name: '추석' },
    { date: '2026-09-26', name: '추석 연휴' },
  ],
};

const pad = (n: number) => String(n).padStart(2, '0');

export function getHolidayName(date: Date): string | null {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = `${y}-${pad(m)}-${pad(d)}`;

  const fixed = FIXED_HOLIDAYS.find(h => h.month === m && h.day === d);
  if (fixed) return fixed.name;

  const lunar = (LUNAR_HOLIDAYS[y] || []).find(h => h.date === key);
  if (lunar) return lunar.name;

  return null;
}

export function isHoliday(date: Date): boolean {
  return getHolidayName(date) !== null;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || isHoliday(date);
}
