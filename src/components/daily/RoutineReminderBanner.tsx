import { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRoutinesForDate, summarizeRoutineCompletions, todayKey } from '@/lib/routines';
import { Link } from 'react-router-dom';

/**
 * 미체크 알림 배너 — 풀 적용
 * - 9:30 이전: 체크인 안내
 * - 18:00 이후: 미완료 루틴이 있으면 체크아웃 안내
 */
export function RoutineReminderBanner() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<ReturnType<typeof summarizeRoutineCompletions> | null>(null);
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    if (!profile) return;
    fetchRoutinesForDate(profile.id, todayKey()).then(items => {
      setSummary(summarizeRoutineCompletions(items));
    });
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, [profile]);

  if (!summary || summary.total === 0) return null;

  const isMorning = hour < 10;
  const isEvening = hour >= 18;
  const incomplete = summary.pending > 0;

  if (!incomplete) return null;
  if (!isMorning && !isEvening) return null;

  return (
    <Card className="p-3 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10">
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
        <div className="flex-1">
          {isMorning ? (
            <span>
              <strong>오늘의 루틴 {summary.total}건</strong>이 대기 중입니다. 데일리 체크인에서 시작하세요.
            </span>
          ) : (
            <span>
              <strong>미완료 루틴 {summary.pending}건</strong>이 남아있습니다. 체크아웃 전에 확인해주세요.
            </span>
          )}
        </div>
        <Link to="/daily-report" className="text-xs text-amber-700 dark:text-amber-400 font-medium hover:underline shrink-0">
          이동 →
        </Link>
      </div>
    </Card>
  );
}
