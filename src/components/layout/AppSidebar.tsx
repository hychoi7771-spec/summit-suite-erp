import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Palette,
  CalendarDays,
  Settings,
  Receipt,
  BarChart3,
  Megaphone,
  ClipboardList,
  UserCog,
  Vote,
  BookOpen,
  Globe,
  ChevronRight,
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
  PackageX,
  Sparkles,
  MessagesSquare,
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
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.jpg';

type NavItem = { title: string; url: string; icon: any; managerOnly?: boolean; ceoOnly?: boolean; managingDirectorOnly?: boolean; accent?: boolean };

// 업무
const workspaceNavItems: NavItem[] = [
  { title: '대시보드', url: '/', icon: LayoutDashboard },
  { title: '업무', url: '/tasks', icon: ListTodo },
  { title: '회의록', url: '/meetings', icon: ClipboardList, ceoOnly: true },
  { title: '일정', url: '/calendar', icon: CalendarDays },
  { title: '공지 게시판', url: '/notices-board', icon: Megaphone },
  { title: '설문/투표', url: '/surveys', icon: Vote },
  { title: '유통기한 임박제품', url: '/stock-alerts', icon: PackageX },
  { title: '디자인 시안', url: '/design-reviews', icon: Palette },
];

// 결재·지출 (전자결재 통합)
const approvalNavItems: NavItem[] = [
  { title: '전자결재', url: '/approvals', icon: Inbox },
  { title: '지출 통합 관리', url: '/expenses', icon: Receipt },
  { title: '근태관리', url: '/attendance', icon: CalendarClock },
];


// 분석
const insightsNavItems: NavItem[] = [
  { title: '영업관리', url: '/sales', icon: BarChart3, managerOnly: true },
  // 행사 현황: 기능 정식 오픈 전까지 대표 계정에만 노출
  { title: '행사 현황', url: '/promotions', icon: PartyPopper, ceoOnly: true },
];

const assetNavItems: NavItem[] = [
  { title: '업무 자산함', url: '/assets/tasks', icon: ListChecks, managingDirectorOnly: true },
  { title: '일일보고 자산함', url: '/assets/daily-reports', icon: NotebookPen, managingDirectorOnly: true },
  { title: '결재문서 자산함', url: '/assets/approvals', icon: FileCheck2, managingDirectorOnly: true },
];

// 더보기 (미사용 - 숨김 처리)
const personalNavItems: NavItem[] = [];

// 관리
const adminNavItems: NavItem[] = [
  { title: '팀원관리', url: '/team', icon: UserCog, managerOnly: true },
  { title: '사내 휴무일', url: '/company-holidays', icon: CalendarOff, managerOnly: true },
  { title: '도메인 연결 상태', url: '/domain-status', icon: Globe, managerOnly: true },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { userRole, isManager } = useAuth();
  const isExecutive = userRole === 'ceo' || userRole === 'general_director' || userRole === 'managing_director';
  const isManagingDirector = userRole === 'managing_director';
  const visibleAdminNavItems = adminNavItems.filter((item) => !item.managerOnly || isManager);
  const visibleAssetNavItems = assetNavItems.filter((item) => !item.managingDirectorOnly || isManagingDirector);

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
    <div className="flex items-center gap-2 px-3 pt-5 pb-2">
      <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
      <span className="text-[11px] font-bold text-sidebar-accent-foreground uppercase tracking-[0.16em]">
        {children}
      </span>
      <span className="flex-1 h-px bg-sidebar-border/70" />
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
        {/* 경영현황 — 대표 전용 강조 카드 */}
        {isExecutive && (
          <SidebarGroup className="pt-2 pb-1">
            <SidebarGroupContent>
              <NavLink
                to="/executive"
                end
                className={`group relative flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-xl overflow-hidden transition-all
                   bg-gradient-to-br from-amber-400/95 via-amber-300/90 to-orange-300/85
                   ring-1 ring-amber-500/40 shadow-[0_4px_14px_-4px_rgba(217,119,6,0.45)]
                   hover:shadow-[0_6px_20px_-4px_rgba(217,119,6,0.55)] hover:scale-[1.01]`}
                activeClassName="ring-2 ring-amber-600/60"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/30 backdrop-blur-sm ring-1 ring-white/40 shrink-0">
                  <Crown className="h-4 w-4 text-amber-900" />
                </div>
                {!collapsed && (
                  <div className="relative min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-amber-950 tracking-tight leading-tight">CEO 인사이트</div>
                    <div className="text-[10px] text-amber-900/75 font-medium tracking-wide">CEO INSIGHT</div>
                  </div>
                )}
                {!collapsed && <ChevronRight className="relative h-3.5 w-3.5 text-amber-900/70 shrink-0" />}
              </NavLink>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 업무 */}
        <SidebarGroup className="py-0">
          {!collapsed && <GroupLabel>업무</GroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(
              workspaceNavItems.filter(
                (item) => (!item.managerOnly || isManager) && (!item.ceoOnly || userRole === 'general_director')
              )
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 결재·지출 */}
        <SidebarGroup className="py-0">
          {!collapsed && <GroupLabel>결재 · 지출</GroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(approvalNavItems)}
            
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 분석 */}
        <SidebarGroup className="py-0">
          {!collapsed && <GroupLabel>분석</GroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(
              insightsNavItems.filter(
                (item) => (!item.managerOnly || isManager) && (!item.ceoOnly || userRole === 'general_director')
              )
            )}
            {!collapsed && visibleAssetNavItems.length > 0 && (
              <div className="mt-0.5">
                <SectionTrigger open={assetsOpen} onOpenChange={setAssetsOpen} icon={Archive} label="자산함">
                  {renderNavItems(visibleAssetNavItems)}
                </SectionTrigger>
              </div>
            )}
            {collapsed && visibleAssetNavItems.length > 0 && renderNavItems(visibleAssetNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 더보기 (미사용 - 숨김) */}
        {!collapsed && personalNavItems.length > 0 && (
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
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-muted text-center tracking-wide">SHFoodHub © 2026</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
