import { ReactNode, useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Search, LogOut, Trash2, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { NoticePopupOnLogin } from '@/components/notices/NoticePopupOnLogin';
import { PendingApprovalToast } from '@/components/approvals/PendingApprovalToast';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = profile?.name_kr || profile?.name || '사용자';
  const avatar = profile?.avatar || displayName.slice(0, 2).toUpperCase();
  const roleLabels: Record<string, string> = {
    ceo: '대표이사',
    general_director: '총괄이사',
    deputy_gm: '차장',
    md: '영업담당',
    designer: '디자이너',
    staff: '사원',
  };
  const roleLabel = userRole ? roleLabels[userRole] || userRole : '사원';

  useEffect(() => {
    fetchNotifications();
    // 사내 휴무일 캐시 로드(근태/캘린더에서 즉시 사용)
    import('@/lib/holidays').then(m => m.loadCompanyHolidays(true));

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setNotifications(data || []);
    setUnreadCount((data || []).filter((n: any) => !n.is_read).length);
  };

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => {
        const deleted = notifications.find(n => n.id === id);
        return deleted && !deleted.is_read ? prev - 1 : prev;
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="검색..."
                  className="bg-transparent text-sm outline-none w-48 placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`relative p-2.5 rounded-xl transition-all ${
                      unreadCount > 0
                        ? 'bg-primary/10 hover:bg-primary/15 ring-2 ring-primary/30 animate-pulse'
                        : 'hover:bg-muted'
                    }`}
                    aria-label={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '알림'}
                  >
                    <Bell className={`h-6 w-6 ${unreadCount > 0 ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-card">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <p className="text-sm font-semibold">알림</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">알림이 없습니다</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-3 py-2.5 border-b border-border/50 last:border-0 ${!n.is_read ? 'bg-primary/5' : ''} group relative`}>
                          <p className="text-xs font-medium pr-6">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ko-KR')}</p>
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1 transition-colors">
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <Settings className="h-4 w-4 mr-2" /> 계정 관리
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> 로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <NoticePopupOnLogin />
      <PendingApprovalToast />
    </SidebarProvider>
  );
}
