import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, Megaphone, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'seen_notice_popups';
const SNOOZE_KEY = 'snoozed_notice_popups'; // { [noticeId]: snoozeUntilISO }

const getSeenIds = (userId: string): string[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markSeen = (userId: string, ids: string[]) => {
  try {
    const existing = new Set(getSeenIds(userId));
    ids.forEach(id => existing.add(id));
    localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(Array.from(existing)));
  } catch {
    // ignore quota errors
  }
};

const getSnoozeMap = (userId: string): Record<string, string> => {
  try {
    const raw = localStorage.getItem(`${SNOOZE_KEY}:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setSnooze = (userId: string, ids: string[], untilIso: string) => {
  try {
    const map = getSnoozeMap(userId);
    ids.forEach(id => { map[id] = untilIso; });
    localStorage.setItem(`${SNOOZE_KEY}:${userId}`, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const isSnoozed = (snoozeMap: Record<string, string>, id: string): boolean => {
  const until = snoozeMap[id];
  if (!until) return false;
  return new Date(until).getTime() > Date.now();
};

const endOfTodayIso = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const sevenDaysFromNowIso = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
};

export function NoticePopupOnLogin() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [popups, setPopups] = useState<any[]>([]);
  const [authorMap, setAuthorMap] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    let cancelled = false;
    const load = async () => {
      // 최근 30일 이내, 팝업 활성화된 공지만
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: notices } = await supabase
        .from('notices')
        .select('*')
        .eq('show_as_popup', true)
        .gte('created_at', thirtyDaysAgo)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (cancelled || !notices || notices.length === 0) return;

      const seen = new Set(getSeenIds(user.id));
      const snoozeMap = getSnoozeMap(user.id);
      const unseen = notices.filter(n => !seen.has(n.id) && !isSnoozed(snoozeMap, n.id));
      if (unseen.length === 0) return;

      // 작성자 이름 매핑
      const authorIds = Array.from(new Set(unseen.map(n => n.author_id)));
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name_kr')
        .in('id', authorIds);
      const map = new Map<string, string>((profs ?? []).map(p => [p.id, p.name_kr]));

      if (cancelled) return;
      setAuthorMap(map);
      setPopups(unseen);
      setIndex(0);
      setOpen(true);
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id, profile?.id]);

  const current = popups[index];
  const isLast = index >= popups.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setIndex(i => i + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    if (user && popups.length > 0) {
      markSeen(user.id, popups.map(p => p.id));
    }
    setOpen(false);
  };

  const handleSnoozeToday = () => {
    if (user && popups.length > 0) {
      setSnooze(user.id, popups.map(p => p.id), endOfTodayIso());
    }
    setOpen(false);
  };

  const handleSnooze7Days = () => {
    if (user && popups.length > 0) {
      setSnooze(user.id, popups.map(p => p.id), sevenDaysFromNowIso());
    }
    setOpen(false);
  };

  const handleGoToBoard = () => {
    handleClose();
    navigate('/notices');
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="gap-1">
              <Megaphone className="h-3 w-3" />
              팝업 공지
            </Badge>
            {current.is_pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="h-3 w-3" />
                고정
              </Badge>
            )}
            {popups.length > 1 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {index + 1} / {popups.length}
              </span>
            )}
          </div>
          <DialogTitle className="text-left text-lg leading-snug">
            {current.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[50vh] overflow-y-auto rounded-md bg-muted/40 p-4">
            {current.content || '(내용 없음)'}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{authorMap.get(current.author_id) ?? '관리자'}</span>
            <span>{new Date(current.created_at).toLocaleString('ko-KR')}</span>
          </div>

          {/* 다시 보지 않기 옵션 */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">다시 보지 않기:</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSnoozeToday}
            >
              오늘 하루
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSnooze7Days}
            >
              7일간
            </Button>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {popups.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              이전
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleGoToBoard}>
            공지 게시판 열기
          </Button>
          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLast ? '확인' : '다음'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
