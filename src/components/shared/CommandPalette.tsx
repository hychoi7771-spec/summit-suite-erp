import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  ListTodo,
  Palette,
  ClipboardList,
  CalendarDays,
  Megaphone,
  Vote,
  PackageX,
  FolderArchive,
  Inbox,
  Receipt,
  CalendarClock,
  BarChart3,
  ListChecks,
  NotebookPen,
  FileCheck2,
  User,
  FileText,
  AtSign,
  FileEdit,
  UserCog,
  CalendarOff,
  FolderOpen,
  BookOpen,
  Crown,
  Plus,
  Search,
} from "lucide-react";

type SearchHit = {
  kind: "task" | "approval" | "notice" | "file";
  id: string;
  title: string;
  subtitle: string | null;
  created_at: string;
};

const hitMeta: Record<SearchHit["kind"], { icon: any; label: string; to: (id: string) => string }> = {
  task: { icon: ListTodo, label: "업무", to: () => "/tasks" },
  approval: { icon: Inbox, label: "결재", to: () => "/approvals" },
  notice: { icon: Megaphone, label: "공지", to: () => "/notices-board" },
  file: { icon: FolderArchive, label: "파일", to: () => "/library" },
};


type Cmd = {
  label: string;
  to: string;
  icon: any;
  keywords?: string;
  managerOnly?: boolean;
};

const workspace: Cmd[] = [
  { label: "대시보드", to: "/", icon: LayoutDashboard, keywords: "dashboard home" },
  { label: "업무", to: "/tasks", icon: ListTodo, keywords: "task todo" },
  { label: "디자인 시안", to: "/design-reviews", icon: Palette, keywords: "design" },
  { label: "회의록", to: "/meetings", icon: ClipboardList, keywords: "meeting" },
  { label: "일정", to: "/calendar", icon: CalendarDays, keywords: "calendar" },
  { label: "공지 게시판", to: "/notices-board", icon: Megaphone, keywords: "notice" },
  { label: "설문/투표", to: "/surveys", icon: Vote, keywords: "survey vote" },
  { label: "유통기한 임박제품", to: "/stock-alerts", icon: PackageX, keywords: "stock alert" },
  { label: "파일", to: "/library", icon: FolderArchive, keywords: "library file" },
];

const approvals: Cmd[] = [
  { label: "결재함", to: "/approvals", icon: Inbox, keywords: "approval" },
  { label: "지출 통합 관리", to: "/expenses", icon: Receipt, keywords: "expense" },
  { label: "근태관리", to: "/attendance", icon: CalendarClock, keywords: "attendance leave" },
];

const insights: Cmd[] = [
  { label: "매출/KPI", to: "/sales", icon: BarChart3, keywords: "sales kpi" },
  { label: "CEO 인사이트", to: "/executive", icon: Crown, keywords: "ceo executive", managerOnly: true },
];

const assets: Cmd[] = [
  { label: "업무 자산함", to: "/assets/tasks", icon: ListChecks },
  { label: "일일보고 자산함", to: "/assets/daily-reports", icon: NotebookPen },
  { label: "결재문서 자산함", to: "/assets/approvals", icon: FileCheck2 },
];

const personal: Cmd[] = [
  { label: "내 프로젝트", to: "/my-projects", icon: User },
  { label: "내 게시물", to: "/my-posts", icon: FileText },
  { label: "나를 언급", to: "/mentions", icon: AtSign },
  { label: "임시저장", to: "/drafts", icon: FileEdit },
];

const admin: Cmd[] = [
  { label: "팀원관리", to: "/team", icon: UserCog, managerOnly: true },
  { label: "사내 휴무일", to: "/company-holidays", icon: CalendarOff, managerOnly: true },
  { label: "프로젝트 폴더", to: "/project-folders", icon: FolderOpen },
  { label: "사용 매뉴얼", to: "/manual", icon: BookOpen },
];

const quickActions: Cmd[] = [
  { label: "새 업무 등록", to: "/tasks?new=1", icon: Plus, keywords: "new task create" },
  { label: "새 결재 작성", to: "/approvals?new=1", icon: Plus, keywords: "new approval" },
  { label: "휴가 신청", to: "/attendance?new=leave", icon: Plus, keywords: "leave vacation" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isManager =
    userRole === "ceo" ||
    userRole === "general_director" ||
    userRole === "managing_director";

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await (supabase as any).rpc("global_search", { _q: q });
      if (!cancelled) {
        setHits((data as SearchHit[] | null) ?? []);
        setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const filterRole = (items: Cmd[]) =>
    items.filter((i) => !i.managerOnly || isManager);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="페이지·업무·결재·공지·파일 검색... (⌘K / Ctrl+K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "검색 중..." : "검색 결과가 없습니다."}
        </CommandEmpty>

        {hits.length > 0 && (
          <>
            <CommandGroup heading="검색 결과">
              {hits.map((h) => {
                const m = hitMeta[h.kind];
                return (
                  <CommandItem
                    key={`${h.kind}-${h.id}`}
                    value={`${h.title} ${h.kind} ${h.id}`}
                    onSelect={() => go(m.to(h.id))}
                  >
                    <m.icon className="mr-2 h-4 w-4 text-primary" />
                    <span className="truncate">{h.title}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.label}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="빠른 작업">
          {quickActions.map((c) => (
            <CommandItem
              key={c.to}
              value={`${c.label} ${c.keywords ?? ""}`}
              onSelect={() => go(c.to)}
            >
              <c.icon className="mr-2 h-4 w-4 text-primary" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>


        <CommandSeparator />

        <CommandGroup heading="업무">
          {filterRole(workspace).map((c) => (
            <CommandItem
              key={c.to}
              value={`${c.label} ${c.keywords ?? ""}`}
              onSelect={() => go(c.to)}
            >
              <c.icon className="mr-2 h-4 w-4" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="결재·지출">
          {filterRole(approvals).map((c) => (
            <CommandItem
              key={c.to}
              value={`${c.label} ${c.keywords ?? ""}`}
              onSelect={() => go(c.to)}
            >
              <c.icon className="mr-2 h-4 w-4" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="분석">
          {filterRole(insights).map((c) => (
            <CommandItem
              key={c.to}
              value={`${c.label} ${c.keywords ?? ""}`}
              onSelect={() => go(c.to)}
            >
              <c.icon className="mr-2 h-4 w-4" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="자산함">
          {filterRole(assets).map((c) => (
            <CommandItem key={c.to} value={c.label} onSelect={() => go(c.to)}>
              <c.icon className="mr-2 h-4 w-4" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="개인">
          {filterRole(personal).map((c) => (
            <CommandItem key={c.to} value={c.label} onSelect={() => go(c.to)}>
              <c.icon className="mr-2 h-4 w-4" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="관리">
          {filterRole(admin).map((c) => (
            <CommandItem key={c.to} value={c.label} onSelect={() => go(c.to)}>
              <c.icon className="mr-2 h-4 w-4" />
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Global hook: ⌘K / Ctrl+K to toggle. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
