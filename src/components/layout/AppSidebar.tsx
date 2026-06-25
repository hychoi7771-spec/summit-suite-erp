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
  Megaphone,
  ClipboardList,
  UserCog,
  Vote,
  BookOpen,
  ChevronRight,
  User,
  FileText,
  AtSign,
  FileEdit,
  FolderOpen,
  CalendarClock,
  CalendarOff,
  Lightbulb,
  PartyPopper,
  ShoppingCart,
  FileSignature,
  Building2,
  Inbox,
  Archive,
  ListChecks,
  NotebookPen,
  FileCheck2,
  Crown,
  Stamp,
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.jpg';

type NavItem = { title: string; url: string; icon: any; managerOnly?: boolean; accent?: boolean };

// 업무
const workspaceNavItems: NavItem[] = [
  { title: '대시보드', url: '/', icon: LayoutDashboard },
  { title: '프로젝트', url: '/projects', icon: FolderKanban },
  { title: '업무', url: '/tasks', icon: ListTodo },
  { title: '디자인 시안', url: '/design-reviews', icon: Palette },
  { title: '회의록', url: '/meetings', icon: ClipboardList },
  { title: '일정', url: '/calendar', icon: CalendarDays },
  { title: '공지 게시판', url: '/notices-board', icon: Megaphone },
  { title: '설문/투표', url: '/surveys', icon: Vote },
  { title: '파일', url: '/library', icon: FolderArchive },
];

// 결재·지출
const approvalNavItems: NavItem[] = [
  { title: '결재함', url: '/approvals', icon: Inbox },
  { title: '지출 통합 관리', url: '/expenses', icon: Receipt },
  { title: '근태관리', url: '/attendance', icon: CalendarClock },
];

// 문서 기안 6종 (결재·지출 내부 아코디언)
const approvalDocItems: NavItem[] = [
  { title: '기획안 품의', url: '/approvals?category=planning_proposal', icon: Lightbulb },
  { title: '행사안 품의', url: '/approvals?category=event_proposal', icon: PartyPopper },
  { title: '구매 품의', url: '/approvals?category=purchase_request', icon: ShoppingCart },
  { title: '계약 품의', url: '/approvals?category=contract_request', icon: FileSignature },
  { title: '출장 품의', url: '/approvals?category=business_trip', icon: Building2 },
  { title: '일반 기안', url: '/approvals?category=general_document', icon: FileText },
];

// 분석
const insightsNavItems: NavItem[] = [
  { title: '매출/KPI', url: '/sales', icon: BarChart3 },
];

const assetNavItems: NavItem[] = [
  { title: '업무 자산함', url: '/assets/tasks', icon: ListChecks },
  { title: '일일보고 자산함', url: '/assets/daily-reports', icon: NotebookPen },
  { title: '결재문서 자산함', url: '/assets/approvals', icon: FileCheck2 },
];

// 더보기
const personalNavItems: NavItem[] = [
  { title: '내 프로젝트', url: '/my-projects', icon: User },
  { title: '내 게시물', url: '/my-posts', icon: FileText },
  { title: '나를 언급', url: '/mentions', icon: AtSign },
  { title: '임시저장', url: '/drafts', icon: FileEdit },
];

// 관리
const adminNavItems: NavItem[] = [
  { title: '팀원관리', url: '/team', icon: UserCog, managerOnly: true },
  { title: '사내 휴무일', url: '/company-holidays', icon: CalendarOff, managerOnly: true },
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
  const isExecutive = userRole === 'ceo' || userRole === 'general_director' || userRole === 'managing_director';
  const [members, setMembers] = useState<any[]>([]);
  const visibleAdminNavItems = adminNavItems.filter((item) => !item.managerOnly || isManager);

  const currentCategory = new URLSearchParams(location.search).get('category');

  const [approvalOpen, setApprovalOpen] = useState(
    () => location.pathname.startsWith('/approvals') || location.pathname.startsWith('/expenses') || location.pathname.startsWith('/attendance')
  );
  const [docsOpen, setDocsOpen] = useState(
    () => location.pathname === '/approvals' && !!currentCategory
  );
  const [assetsOpen, setAssetsOpen] = useState(() => location.pathname.startsWith('/assets'));
  const [insightsOpen, setInsightsOpen] = useState(
    () => location.pathname.startsWith('/sales') || location.pathname.startsWith('/assets')
  );
  const [personalOpen, setPersonalOpen] = useState(() =>
    personalNavItems.some((i) => i.url === location.pathname)
  );
  const [adminOpen, setAdminOpen] = useState(() =>
    visibleAdminNavItems.some((i) => location.pathname === i.url)
  );

  const roleOrder: Record<string, number> = {
    ceo: 0, general_director: 1, managing_director: 2, deputy_gm: 3, md: 4, designer: 5, assistant_manager: 6, staff: 7,
  };

  useEffect(() => {
    const fetchMembers = async () => {
      const [profRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('id, user_id, name_kr, name, avatar, presence'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      const roles = roleRes.data || [];
      const sorted = (profRes.data || []).sort((a, b) => {
        const rA = roles.find((r) => r.user_id === a.user_id)?.role;
        const rB = roles.find((r) => r.user_id === b.user_id)?.role;
        return (roleOrder[rA ?? ''] ?? 99) - (roleOrder[rB ?? ''] ?? 99);
      });
      setMembers(sorted);
    };
    fetchMembers();

    const channel = supabase
      .channel('sidebar-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isItemActive = (url: string) => {
    const [path, query] = url.split('?');
    if (location.pathname !== path) return false;
    if (!query) return path !== '/approvals' || !currentCategory;
    const itemCat = new URLSearchParams(query).get('category');
    return itemCat === currentCategory;
  };

  const renderNavItems = (items: NavItem[]) => (
    <SidebarMenu className="gap-0.5">
      {items.map((item) => {
        const active = isItemActive(item.url);
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-9 rounded-lg">
              <NavLink
                to={item.url}
                end={item.url === '/'}
                className={`group relative flex items-center gap-2.5 px-2.5 transition-all ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    active ? 'text-primary' : item.accent ? 'text-amber-500' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                  }`}
                />
                {!collapsed && (
                  <span className={`text-[13px] tracking-tight ${item.accent && !active ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
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

  const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 pt-4 pb-2 text-xs font-bold text-sidebar-accent-foreground uppercase tracking-[0.14em]">
      {children}
    </div>
  );

  const SectionTrigger = ({
    open,
    onOpenChange,
    icon: Icon,
    label,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    icon: any;
    label: string;
    children: React.ReactNode;
  }) => (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[13px] font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors rounded-lg hover:bg-sidebar-accent/40">
        <div className="flex items-center gap-2.5">
          <Icon className="h-[18px] w-[18px] text-sidebar-foreground/60" />
          <span className="tracking-tight">{label}</span>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform ${open ? 'rotate-90' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-3 mt-0.5">{children}</CollapsibleContent>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="SHFoodHub" className="h-8 w-8 rounded-lg object-contain shrink-0 ring-1 ring-sidebar-border/60" />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="text-[13px] font-bold text-sidebar-foreground truncate tracking-tight">SHFoodHub</h2>
              <p className="text-[10.5px] text-sidebar-muted truncate">리타방앗간 허브</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-0">
        {/* 경영현황 — 별도 강조 (대표/총괄/관리이사) */}
        {isExecutive && (
          <SidebarGroup className="py-1">
            <SidebarGroupContent>
              {renderNavItems([{ title: '경영현황', url: '/executive', icon: Crown, accent: true }])}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 업무 */}
        <SidebarGroup className="py-0">
          {!collapsed && <GroupLabel>업무</GroupLabel>}
          <SidebarGroupContent>{renderNavItems(workspaceNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        {/* 결재·지출 */}
        <SidebarGroup className="py-0">
          {!collapsed && <GroupLabel>결재 · 지출</GroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(approvalNavItems)}
            {!collapsed && (
              <div className="mt-0.5">
                <SectionTrigger open={docsOpen} onOpenChange={setDocsOpen} icon={Stamp} label="문서 기안">
                  {renderNavItems(approvalDocItems)}
                </SectionTrigger>
              </div>
            )}
            {collapsed && renderNavItems(approvalDocItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 분석 */}
        <SidebarGroup className="py-0">
          {!collapsed && <GroupLabel>분석</GroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(insightsNavItems)}
            {!collapsed && (
              <div className="mt-0.5">
                <SectionTrigger open={assetsOpen} onOpenChange={setAssetsOpen} icon={Archive} label="자산함">
                  {renderNavItems(assetNavItems)}
                </SectionTrigger>
              </div>
            )}
            {collapsed && renderNavItems(assetNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 더보기 */}
        {!collapsed && (
          <SidebarGroup className="py-0">
            <GroupLabel>더보기</GroupLabel>
            <SidebarGroupContent>{renderNavItems(personalNavItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 관리 */}
        {!collapsed && (
          <SidebarGroup className="py-0">
            <GroupLabel>관리</GroupLabel>
            <SidebarGroupContent>{renderNavItems(visibleAdminNavItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 팀원 */}
        {!collapsed && (
          <SidebarGroup className="py-0 mt-2">
            <GroupLabel>팀원</GroupLabel>
            <div className="px-1.5 pb-3 space-y-0.5">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/40 transition-colors">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-sidebar-accent flex items-center justify-center ring-1 ring-sidebar-border/40">
                      <span className="text-[10px] font-medium text-sidebar-accent-foreground">{member.avatar}</span>
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-sidebar-background ${statusColors[member.presence] || 'bg-muted-foreground/40'}`} />
                  </div>
                  <span className="text-[12px] text-sidebar-foreground/80 truncate">{member.name}</span>
                </div>
              ))}
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-muted text-center tracking-wide">SHFoodHub © 2026</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
