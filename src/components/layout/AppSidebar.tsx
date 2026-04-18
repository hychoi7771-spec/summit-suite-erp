import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Palette,
  CalendarDays,
  FolderArchive,
  Settings,
  Receipt,
  BarChart3,
  Stamp,
  Megaphone,
  ClipboardList,
  UserCog,
  Vote,
  BookOpen,
  ChevronDown,
  User,
  FileText,
  AtSign,
  FileEdit,
  FolderOpen,
  ClipboardCheck,
  CalendarClock,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.jpg';

const mainNavItems = [
  { title: '대시보드', url: '/', icon: LayoutDashboard },
  { title: '프로젝트', url: '/projects', icon: FolderKanban },
  { title: '업무', url: '/tasks', icon: ListTodo },
  { title: '데일리 체크인', url: '/daily-report', icon: ClipboardCheck, accent: true },
  { title: '디자인 시안', url: '/design-reviews', icon: Palette },
  { title: '회의록', url: '/meetings', icon: ClipboardList },
  { title: '일정', url: '/calendar', icon: CalendarDays },
  { title: '근태관리', url: '/attendance', icon: CalendarClock },
  { title: '경비관리', url: '/expenses', icon: Receipt },
  { title: '전자결재', url: '/approvals', icon: Stamp },
  { title: '공지 게시판', url: '/notices-board', icon: Megaphone },
  { title: '설문/투표', url: '/surveys', icon: Vote },
  { title: '파일', url: '/library', icon: FolderArchive },
];

const personalNavItems = [
  { title: '내 프로젝트', url: '/my-projects', icon: User },
  { title: '내 게시물', url: '/my-posts', icon: FileText },
  { title: '나를 언급', url: '/mentions', icon: AtSign },
  { title: '임시저장', url: '/drafts', icon: FileEdit },
];

const adminNavItems = [
  { title: '매출/KPI', url: '/sales', icon: BarChart3 },
  { title: '팀원관리', url: '/team', icon: UserCog, managerOnly: true },
  { title: '프로젝트 폴더', url: '/project-folders', icon: FolderOpen },
  { title: '사용 매뉴얼', url: '/manual', icon: BookOpen },
];

const statusColors: Record<string, string> = {
  working: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground/40',
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { userRole, isManager } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const visibleAdminNavItems = adminNavItems.filter(
    (item) => !('managerOnly' in item && (item as any).managerOnly) || isManager
  );
  const [adminOpen, setAdminOpen] = useState(() => {
    return visibleAdminNavItems.some(item => location.pathname === item.url);
  });
  const [personalOpen, setPersonalOpen] = useState(() => {
    return personalNavItems.some(item => location.pathname === item.url);
  });

  const roleOrder: Record<string, number> = {
    ceo: 0, general_director: 1, deputy_gm: 2, md: 3, designer: 4, staff: 5,
  };

  useEffect(() => {
    const fetchMembers = async () => {
      const [profRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('id, user_id, name_kr, name, avatar, presence'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      const roles = roleRes.data || [];
      const sorted = (profRes.data || []).sort((a, b) => {
        const rA = roles.find(r => r.user_id === a.user_id)?.role;
        const rB = roles.find(r => r.user_id === b.user_id)?.role;
        return (roleOrder[rA ?? ''] ?? 99) - (roleOrder[rB ?? ''] ?? 99);
      });
      setMembers(sorted);
    };
    fetchMembers();

    const channel = supabase
      .channel('sidebar-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchMembers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const renderNavItems = (items: typeof mainNavItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const isAccent = 'accent' in item && (item as any).accent;
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === item.url}
              tooltip={item.title}
            >
              <NavLink
                to={item.url}
                end={item.url === '/'}
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <item.icon className={`h-4 w-4 ${isAccent ? 'text-emerald-500' : ''}`} />
                {!collapsed && (
                  <span className={isAccent && location.pathname !== item.url ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                    {item.title}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SHFoodHub" className="h-8 w-8 rounded-lg object-contain shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">SHFoodHub</h2>
              <p className="text-xs text-sidebar-muted truncate">리타방앗간 허브</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            {renderNavItems(mainNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Personal Section (더보기 style) */}
        {!collapsed && (
          <SidebarGroup>
            <Collapsible open={personalOpen} onOpenChange={setPersonalOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-sidebar-muted uppercase tracking-wider hover:text-sidebar-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>더보기</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${personalOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  {renderNavItems(personalNavItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Admin / Management Section */}
        {!collapsed && (
          <SidebarGroup>
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-sidebar-muted uppercase tracking-wider hover:text-sidebar-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  <span>관리</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  {renderNavItems(visibleAdminNavItems)}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Team Members */}
        {!collapsed && (
          <SidebarGroup>
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-sidebar-muted uppercase tracking-wider mb-2">팀원</p>
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                    <div className="relative">
                      <div className="h-6 w-6 rounded-full bg-sidebar-accent flex items-center justify-center">
                        <span className="text-[10px] font-medium text-sidebar-accent-foreground">{member.avatar}</span>
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar-background ${statusColors[member.presence] || 'bg-muted-foreground/40'}`} />
                    </div>
                    <span className="text-xs text-sidebar-foreground truncate">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-muted text-center">SHFoodHub © 2026</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
