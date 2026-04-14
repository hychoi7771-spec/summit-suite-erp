import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, ClipboardList, AlertTriangle, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DailyLogCalendarViewProps {
  dailyLogs: any[];
  profiles: any[];
  profileId: string | null;
  canEditLog: (log: any) => boolean;
  onEditLog: (log: any) => void;
  onDeleteLog: (logId: string) => void;
}

export default function DailyLogCalendarView({
  dailyLogs, profiles, profileId, canEditLog, onEditLog, onDeleteLog,
}: DailyLogCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  const logsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    dailyLogs.forEach(log => {
      const key = log.date;
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return map;
  }, [dailyLogs]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0=Sun

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedLogs = selectedDateStr ? (logsByDate[selectedDateStr] || []) : [];

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {weekdays.map(day => (
          <div key={day} className="bg-muted py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {/* Empty cells before first day */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-card p-2 min-h-[72px]" />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasLogs = !!logsByDate[dateStr];
          const logCount = logsByDate[dateStr]?.length || 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          // Get unique avatars for this day
          const dayAvatars = (logsByDate[dateStr] || [])
            .map(l => getProfile(l.user_id))
            .filter(Boolean)
            .slice(0, 3);

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              className={`bg-card p-1.5 min-h-[72px] text-left transition-colors hover:bg-muted/50 relative
                ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
              `}
            >
              <span className={`text-xs font-medium inline-flex items-center justify-center h-6 w-6 rounded-full
                ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}
              `}>
                {format(day, 'd')}
              </span>
              {hasLogs && (
                <div className="flex items-center gap-0.5 mt-1">
                  {dayAvatars.map((p, i) => (
                    <div key={i} className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[8px] text-primary-foreground font-medium">{p.avatar}</span>
                    </div>
                  ))}
                  {logCount > 3 && (
                    <span className="text-[9px] text-muted-foreground ml-0.5">+{logCount - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date logs */}
      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })} 로그
            {selectedLogs.length === 0 && ' — 작성된 로그가 없습니다'}
          </h4>
          {selectedLogs.map(log => {
            const user = getProfile(log.user_id);
            const isOwner = canEditLog(log);
            return (
              <Card key={log.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">{user?.avatar || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{user?.name_kr || '알 수 없음'}</span>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onEditLog(log)} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDeleteLog(log.id)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 p-3">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />완료한 업무
                    </p>
                    <p className="text-sm whitespace-pre-line leading-relaxed">{log.today_work}</p>
                  </div>
                  {log.tomorrow_plan && (
                    <div className="rounded-md bg-blue-500/5 border border-blue-500/10 p-3">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />예정된 업무
                      </p>
                      <p className="text-sm whitespace-pre-line leading-relaxed">{log.tomorrow_plan}</p>
                    </div>
                  )}
                  {log.blockers && log.blockers !== '특이사항 없음' && (
                    <div className="rounded-md bg-amber-500/5 border border-amber-500/10 p-3">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />이슈 및 요청사항
                      </p>
                      <p className="text-sm whitespace-pre-line leading-relaxed">{log.blockers}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
