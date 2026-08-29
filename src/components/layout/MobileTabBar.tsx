import { LayoutDashboard, ListTodo, CalendarDays, Inbox, Menu } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const tabs = [
  { title: '홈', url: '/', icon: LayoutDashboard },
  { title: '업무', url: '/tasks', icon: ListTodo },
  { title: '일정', url: '/calendar', icon: CalendarDays },
  { title: '결재', url: '/approvals', icon: Inbox },
];

export function MobileTabBar() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  if (!isMobile) return null;

  const isActive = (url: string) =>
    url === '/' ? location.pathname === '/' : location.pathname.startsWith(url);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="모바일 하단 메뉴"
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = isActive(tab.url);
          return (
            <NavLink
              key={tab.url}
              to={tab.url}
              end={tab.url === '/'}
              className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
              <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{tab.title}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="전체 메뉴 열기"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px]">메뉴</span>
        </button>
      </div>
    </nav>
  );
}
