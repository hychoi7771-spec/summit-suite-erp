import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, FolderKanban, ListTodo, Palette, Users, Receipt, BarChart3,
  FolderArchive, CalendarDays, UserCog, Megaphone, Stamp, Bell,
  ChevronRight, BookOpen, Shield, LogIn, GanttChartSquare, MessageSquare, Link2, History,
  Briefcase, FileEdit, AtSign, Folder, ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', label: '시스템 개요', icon: BookOpen },
  { id: 'login', label: '로그인', icon: LogIn },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'projects', label: '프로젝트 관리', icon: FolderKanban },
  { id: 'tasks', label: '업무관리', icon: ListTodo },
  { id: 'gantt', label: '간트차트', icon: GanttChartSquare },
  { id: 'daily-report', label: '일일업무보고', icon: ClipboardCheck },
  { id: 'design-reviews', label: '디자인 시안', icon: Palette },
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'library', label: '파일/자료실', icon: FolderArchive },
  { id: 'meetings', label: '회의록', icon: Users },
  { id: 'expenses', label: '경비관리', icon: Receipt },
  { id: 'sales', label: '매출/KPI', icon: BarChart3 },
  { id: 'approvals', label: '전자결재', icon: Stamp },
  { id: 'notices', label: '공지 게시판', icon: Megaphone },
  { id: 'team', label: '팀원관리', icon: UserCog },
  { id: 'my-projects', label: '내 프로젝트', icon: Briefcase },
  { id: 'my-posts', label: '내 게시물', icon: MessageSquare },
  { id: 'mentions', label: '나를 언급', icon: AtSign },
  { id: 'drafts', label: '임시저장', icon: FileEdit },
  { id: 'project-folders', label: '프로젝트 폴더', icon: Folder },
  { id: 'notifications', label: '알림 시스템', icon: Bell },
  { id: 'roles', label: '권한 체계', icon: Shield },
];

export default function Manual() {
  const [active, setActive] = useState('overview');

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📘 SHFoodHub 사용 매뉴얼</h1>
        <p className="text-sm text-muted-foreground mt-1">SHFoodHub — 전체 기능 가이드 (v2.0)</p>
      </div>

      <div className="flex gap-6">
        {/* 사이드 네비게이션 */}
        <Card className="hidden lg:block w-64 shrink-0 sticky top-20 self-start">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">목차</p>
            <nav className="space-y-0.5">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors',
                    active === s.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* 본문 */}
        <div className="flex-1 min-w-0 space-y-6 pb-20">

          {/* ── 시스템 개요 ── */}
          <Section id="overview" title="시스템 개요" icon={BookOpen}>
            <p>
              <strong>SHFoodHub</strong>는 기획자, 디자이너, 마케팅 담당자가 함께 사용하는
              웹 기반 SaaS 협업 플랫폼입니다. Flow, Notion, Jira의 장점을 참고한 직관적인 카드형 업무 관리 구조를 제공합니다.
            </p>
            <InfoBox title="주요 특징">
              <ul className="list-disc list-inside space-y-1">
                <li>프로젝트 기반 업무 관리 — 카드형 프로젝트 + 칸반 보드 + 간트차트</li>
                <li>디자인 시안 협업 — 시안 업로드, 버전 관리, 댓글 피드백, 승인 워크플로</li>
                <li>업무 카드 고도화 — 댓글, @멘션, 관련 업무 연결, 변경 히스토리</li>
                <li>실시간 데이터 동기화 — 팀원 간 변경사항 즉시 반영</li>
                <li>직급 기반 권한 체계 — 역할별 접근 권한 자동 관리</li>
                <li>알림 시스템 — 멘션, 업무 배정, 결재 등 자동 알림</li>
              </ul>
            </InfoBox>
            <SubSection title="메뉴 구조">
              <p>사이드바는 <strong>메인 메뉴</strong>와 접이식 <strong>관리 메뉴</strong>로 구성됩니다.</p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-semibold mb-1.5">메인 메뉴</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>대시보드 · 프로젝트 · 업무 · 디자인 시안</li>
                    <li>일정 · 파일 · 알림</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-semibold mb-1.5">더보기 (개인 메뉴)</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>내 프로젝트 · 내 게시물 · 나를 언급 · 임시저장</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-semibold mb-1.5">관리 메뉴 (접이식)</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>경비관리 · 매출/KPI · 전자결재</li>
                    <li>공지 게시판 · 설문/투표 · 팀원관리 · 프로젝트 폴더 · 매뉴얼</li>
                  </ul>
                </div>
              </div>
            </SubSection>
          </Section>

          {/* ── 로그인 ── */}
          <Section id="login" title="로그인" icon={LogIn}>
            <Steps items={[
              '관리자가 발급한 이메일 계정과 비밀번호를 입력합니다.',
              '"로그인" 버튼을 클릭하여 접속합니다.',
              '로그인 후 자동으로 대시보드로 이동합니다.',
            ]} />
            <InfoBox title="참고" variant="warning">
              계정은 관리자(대표이사, 이사)만 생성할 수 있습니다. 계정이 없는 경우 관리자에게 요청하세요.
            </InfoBox>
            <SubSection title="팀원 계정 정보">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold">이름</th>
                      <th className="text-left py-2 pr-4 font-semibold">직급</th>
                      <th className="text-left py-2 pr-4 font-semibold">아이디</th>
                      <th className="text-left py-2 font-semibold">비밀번호</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      { name: '이기태', role: '부장', id: 'gitae', pw: 'admin123' },
                      { name: '여인혜', role: '차장', id: 'inhye', pw: 'admin123' },
                      { name: '박가영', role: '대리', id: 'gayoung', pw: 'admin123' },
                      { name: '박진아', role: '사원', id: 'jina', pw: 'admin123' },
                    ].map((u, i) => (
                      <tr key={u.id} className={i < 3 ? 'border-b border-border/50' : ''}>
                        <td className="py-2 pr-4 font-medium text-foreground">{u.name}</td>
                        <td className="py-2 pr-4">{u.role}</td>
                        <td className="py-2 pr-4"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{u.id}</code></td>
                        <td className="py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{u.pw}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <InfoBox title="보안 안내" variant="warning">
                초기 비밀번호는 로그인 후 변경하는 것을 권장합니다. 대표이사 및 이사 계정 정보는 보안상 별도로 관리됩니다.
              </InfoBox>
            </SubSection>
          </Section>

          {/* ── 대시보드 ── */}
          <Section id="dashboard" title="대시보드" icon={LayoutDashboard}>
            <p>로그인 후 처음 보이는 화면으로, 전사 경영 현황을 한눈에 파악할 수 있습니다.</p>
            <SubSection title="주요 구성 요소">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>통계 카드 (4개)</strong> — 월 매출, 진행 중 제품, 미완료 업무, 대기 중 경비</li>
                <li><strong>플랫폼별 매출 차트</strong> — 막대 그래프로 플랫폼별 매출 vs 목표 비교</li>
                <li><strong>업무 분포</strong> — 도넛 차트로 할 일/진행 중/검토/완료 비율 확인</li>
                <li><strong>월별 매출 트렌드</strong> — 라인 차트로 매출 추이 확인</li>
                <li><strong>제품 파이프라인</strong> — 제품별 진행 단계와 진행률</li>
                <li><strong>팀 현황</strong> — 팀원별 진행 중 업무 수</li>
              </ul>
            </SubSection>
            <InfoBox title="관리자 전용">
              관리자(대표이사, 이사)에게는 <strong>실시간 접속 현황</strong> 패널이 추가로 표시됩니다.
            </InfoBox>
          </Section>

          {/* ── 프로젝트 관리 (NEW) ── */}
          <Section id="projects" title="프로젝트 관리" icon={FolderKanban}>
            <NewBadge />
            <p>프로젝트 단위로 업무를 관리합니다. 카드형 UI로 프로젝트 목록을 표시하며, 상태별 필터링과 참여자 관리를 지원합니다.</p>

            <SubSection title="프로젝트 생성">
              <Steps items={[
                '"새 프로젝트" 버튼 클릭',
                '프로젝트명, 카테고리, 상태, 담당자, 마감일 입력',
                '참여자 선택 — 칩을 클릭하여 여러 명 지정 가능',
                '설명 입력 후 "등록" 클릭',
              ]} />
            </SubSection>

            <SubSection title="프로젝트 상태">
              <div className="flex flex-wrap gap-2 my-2">
                {[
                  { label: '진행중', desc: '현재 활발히 진행 중인 프로젝트' },
                  { label: '보류', desc: '일시 중단된 프로젝트' },
                  { label: '완료', desc: '모든 업무가 마무리된 프로젝트' },
                ].map(s => (
                  <div key={s.label} className="p-2.5 rounded-lg border bg-muted/30 flex-1 min-w-[120px]">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">상단 필터 버튼 또는 카드 우측 ⋯ 메뉴에서 상태를 변경할 수 있습니다.</p>
            </SubSection>

            <SubSection title="프로젝트 카드 구성">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>상태 뱃지</strong> — 진행중/보류/완료 + 카테고리 표시</li>
                <li><strong>진행률</strong> — 연결된 업무의 완료율을 자동 계산</li>
                <li><strong>담당자 & 참여자</strong> — 아바타로 표시 (3명 초과 시 +N 표시)</li>
                <li><strong>마감일</strong> — 하단에 캘린더 아이콘과 함께 표시</li>
              </ul>
            </SubSection>

            <InfoBox title="업무 연동">
              업무 등록 시 프로젝트명을 지정하면, 해당 프로젝트 카드에 업무 완료율이 자동으로 반영됩니다.
            </InfoBox>
          </Section>

          {/* ── 업무관리 ── */}
          <Section id="tasks" title="업무관리" icon={ListTodo}>
            <p>업무를 카드(Task Card) 방식으로 관리합니다. 상단 탭으로 <strong>[칸반 보드]</strong>, <strong>[간트차트]</strong>, <strong>[데일리 로그]</strong>를 전환합니다.</p>

            <SubSection title="칸반 보드">
              <p>업무를 드래그 앤 드롭으로 상태를 변경할 수 있는 칸반 보드입니다.</p>
              <div className="flex flex-wrap gap-2 my-2">
                {['할 일', '진행 중', '검토', '완료'].map(s => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
              <Steps items={[
                '"새 업무 등록" 버튼 → 프로젝트, 제목, 설명, 우선순위, 담당자, 시작일, 마감일 입력',
                '카드를 드래그하여 다른 컬럼으로 이동 → 상태 자동 변경',
                '프로젝트 필터로 특정 프로젝트의 업무만 조회',
                '카드 클릭 → 업무 상세 모달 열기 (댓글, 연결, 히스토리)',
              ]} />
            </SubSection>

            <SubSection title="업무 상세 기능">
              <NewBadge />
              <div className="space-y-3 mt-2">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">댓글 & @멘션</p>
                    <p className="text-xs text-muted-foreground">업무 카드 내에서 팀원과 소통합니다. @를 입력하면 멘션 대상 목록이 표시되며, 멘션된 팀원에게 자동 알림이 전송됩니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">관련 업무 연결</p>
                    <p className="text-xs text-muted-foreground">다른 업무를 검색하여 링크로 연결합니다. 연관된 업무를 빠르게 탐색할 수 있습니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <History className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">변경 히스토리</p>
                    <p className="text-xs text-muted-foreground">업무의 모든 변경사항(상태, 담당자, 댓글 등)을 시간순으로 기록합니다.</p>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="데일리 로그">
              <p>매일의 업무 기록을 작성합니다. 상세 내용은 <strong>일일업무보고</strong> 섹션을 참고하세요.</p>
            </SubSection>
          </Section>

          {/* ── 간트차트 (NEW) ── */}
          <Section id="gantt" title="간트차트" icon={GanttChartSquare}>
            <NewBadge />
            <p>업무의 시작일~마감일을 타임라인 바로 시각화하여 일정 현황을 한눈에 파악합니다. Flow의 간트차트와 유사한 구조입니다.</p>

            <SubSection title="화면 구성">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>좌측 패널</strong> — 업무명, 상태(컬러 뱃지), 시작일, 마감일을 테이블 형태로 표시</li>
                <li><strong>우측 타임라인</strong> — 월/일 헤더 + 가로 바로 기간 시각화</li>
                <li><strong>프로젝트 그룹핑</strong> — 업무가 프로젝트별로 자동 그룹화</li>
              </ul>
            </SubSection>

            <SubSection title="사용 방법">
              <Steps items={[
                '업무 페이지에서 "간트차트" 탭 클릭',
                '화살표 버튼으로 주/월 단위 이동, "오늘" 버튼으로 현재 위치 복귀',
                '바 색상으로 업무 상태 확인 (대기=회색, 진행=파랑, 검토=노랑, 완료=초록)',
                '업무 행 또는 바 클릭 → 업무 상세 모달 열기',
              ]} />
            </SubSection>

            <BadgeLegend items={[
              { label: '대기', color: 'bg-muted-foreground/60' },
              { label: '진행', color: 'bg-info' },
              { label: '검토', color: 'bg-warning' },
              { label: '완료', color: 'bg-success' },
            ]} />

            <InfoBox title="시작일 설정">
              간트차트에 바가 정확히 표시되려면 업무 등록/수정 시 <strong>시작일</strong>과 <strong>마감일</strong>을 모두 입력하세요.
              시작일이 없으면 생성일 기준으로 자동 표시됩니다.
            </InfoBox>
          </Section>

          {/* ── 일일업무보고 (NEW) ── */}
          <Section id="daily-report" title="일일업무보고" icon={ClipboardCheck}>
            <NewBadge />
            <p>매일의 업무를 등록하고, 퇴근 전 완료 여부를 체크한 뒤 이사 확인과 대표이사 최종 승인까지 진행하는 <strong>4단계 일일업무보고 시스템</strong>입니다. 사이드바 메인 메뉴에서 접근합니다.</p>

            <SubSection title="전체 플로우">
              <div className="space-y-3 my-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold shrink-0">1</span>
                  <div>
                    <p className="text-sm font-semibold">☀️ 오전 체크인</p>
                    <p className="text-xs text-muted-foreground">출근 후 금일 할 업무를 등록합니다</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-700 text-sm font-bold shrink-0">2</span>
                  <div>
                    <p className="text-sm font-semibold">🚪 퇴근 전 체크아웃</p>
                    <p className="text-xs text-muted-foreground">각 업무의 완료 여부를 체크한 뒤 체크아웃합니다</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold shrink-0">3</span>
                  <div>
                    <p className="text-sm font-semibold">✅ 이사 확인</p>
                    <p className="text-xs text-muted-foreground">이사(총괄이사)가 보고서를 확인하고 승인합니다</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold shrink-0">4</span>
                  <div>
                    <p className="text-sm font-semibold">🔖 대표이사 최종 승인</p>
                    <p className="text-xs text-muted-foreground">대표이사가 직인을 날인하여 최종 승인합니다</p>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection title="1단계: 체크인 (업무 등록)">
              <Steps items={[
                '일일업무보고 페이지에서 초록색 "☀️ 체크인" 버튼을 클릭합니다.',
                '체크인 다이얼로그에서 오늘 할 업무를 입력합니다.',
                '각 업무에 카테고리(기획/디자인/R&D/마케팅/기타)와 우선순위(높음/보통/낮음)를 지정합니다.',
                '"+" 버튼으로 업무를 추가하고, 필요 시 비고란에 메모를 작성합니다.',
                '"체크인" 버튼을 클릭하면 오늘의 보고서가 생성되고, 등록한 업무가 업무 보드에도 자동 등록됩니다.',
              ]} />
              <InfoBox title="참고">
                하루에 1회만 체크인 가능합니다. 이미 체크인한 경우 체크인 버튼 대신 체크아웃 버튼이 표시됩니다.
              </InfoBox>
            </SubSection>

            <SubSection title="2단계: 체크아웃 (완료 체크)">
              <Steps items={[
                '퇴근 전, 보고서의 각 업무 항목을 클릭하여 완료(✅) 또는 미완료(⭕) 상태를 표시합니다.',
                '모든 업무의 완료 여부를 확인한 뒤, 주황색 "🚪 체크아웃" 버튼을 클릭합니다.',
                '확인 다이얼로그에서 "체크아웃"을 클릭하여 확정합니다.',
                '체크아웃 후에는 업무 완료 상태를 변경할 수 없으므로 신중하게 확인하세요.',
              ]} />
              <InfoBox title="체크아웃 버튼 위치" variant="warning">
                체크아웃 버튼은 두 곳에 표시됩니다: ① 페이지 상단 헤더 (주황색 펄스 버튼), ② 본인 보고서 카드 하단 (주황색 강조 영역). 본인이 작성한 보고서에만 표시됩니다.
              </InfoBox>
            </SubSection>

            <SubSection title="3단계: 이사(총괄이사) 확인">
              <p>체크아웃이 완료된 보고서에는 "승인 현황" 영역이 표시됩니다.</p>
              <Steps items={[
                '이사(총괄이사) 계정으로 로그인합니다.',
                '일일업무보고 페이지에서 체크아웃 완료된 보고서를 확인합니다.',
                '보고서 카드 하단의 승인 현황에서 보라색 "✅ 확인 승인" 버튼을 클릭합니다.',
                '확인 승인 후 상태가 "이사 확인 완료"로 변경되며, 승인 시간이 기록됩니다.',
              ]} />
              <InfoBox title="참고">
                이사 확인 버튼은 이사(총괄이사) 직급으로 로그인한 경우에만 표시됩니다. 체크아웃되지 않은 보고서에는 승인 현황이 표시되지 않습니다.
              </InfoBox>
            </SubSection>

            <SubSection title="4단계: 대표이사 최종 승인 (직인)">
              <Steps items={[
                '대표이사 계정으로 로그인합니다.',
                '일일업무보고 페이지에서 이사 확인이 완료된 보고서를 확인합니다.',
                '승인 현황에서 파란색 "🔖 직인 승인" 버튼을 클릭합니다.',
                '최종 승인 후 보고서에 직인 이미지가 표시되며, 상태가 "최종 승인"으로 변경됩니다.',
              ]} />
              <InfoBox title="승인 순서" variant="warning">
                대표이사 승인은 반드시 이사 확인이 완료된 후에만 가능합니다. 이사 확인이 없는 보고서에는 대표이사 승인 버튼이 표시되지 않습니다.
              </InfoBox>
            </SubSection>

            <SubSection title="보고서 상태 표시">
              <div className="space-y-2 my-2">
                {[
                  { icon: '☀️', label: '체크인', desc: '업무가 등록된 상태 (초록색)', color: 'bg-emerald-100 text-emerald-700' },
                  { icon: '🚪', label: '체크아웃 완료', desc: '퇴근 전 완료 체크가 끝난 상태 (주황색)', color: 'bg-orange-100 text-orange-700' },
                  { icon: '✅', label: '이사 확인', desc: '이사가 보고서를 확인한 상태 (보라색)', color: 'bg-purple-100 text-purple-700' },
                  { icon: '🔖', label: '최종 승인', desc: '대표이사 직인 승인 완료 (파란색)', color: 'bg-blue-100 text-blue-700' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                    <Badge variant="outline" className={`text-xs ${s.color}`}>{s.icon} {s.label}</Badge>
                    <span className="text-xs text-muted-foreground">{s.desc}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="추가 기능">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>이모지 리액션</strong> — 보고서에 이모지로 반응을 남길 수 있습니다</li>
                <li><strong>댓글</strong> — 보고서 카드 하단에서 팀원과 소통할 수 있습니다</li>
                <li><strong>보기 전환</strong> — 타임라인/인원별/테이블/주간/월간/연간 보기 지원</li>
                <li><strong>보고서 삭제</strong> — 본인 보고서 또는 관리자가 삭제 가능 (확인 대화상자 포함)</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 디자인 시안 (NEW) ── */}
          <Section id="design-reviews" title="디자인 시안" icon={Palette}>
            <NewBadge />
            <p>디자이너와 기획자가 디자인 시안을 공유하고 피드백을 주고받는 전용 모듈입니다.</p>

            <SubSection title="시안 등록">
              <Steps items={[
                '"새 시안 등록" 버튼 클릭',
                '제목, 설명, 버전(v1/v2/v3), 담당자, 연결 프로젝트 입력',
                '디자인 파일 업로드 (이미지, PDF 등)',
                '"등록" 클릭',
              ]} />
            </SubSection>

            <SubSection title="버전 관리">
              <p>시안은 버전별로 관리됩니다. 새 버전을 등록하면 이전 버전과 비교할 수 있습니다.</p>
              <div className="flex gap-2 mt-2">
                {['v1', 'v2', 'v3'].map(v => <Badge key={v} variant="outline">{v}</Badge>)}
              </div>
            </SubSection>

            <SubSection title="피드백 & 승인">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>댓글 작성</strong> — 시안 상세 화면에서 텍스트 피드백 입력</li>
                <li><strong>수정 요청</strong> — 댓글 작성 시 "수정 요청" 체크 → 시안 상태가 자동으로 "수정요청"으로 변경</li>
                <li><strong>승인</strong> — 관리자 또는 업로더가 "승인완료"로 상태 변경</li>
              </ul>
            </SubSection>

            <SubSection title="시안 상태">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '검토중', desc: '피드백 대기' },
                  { label: '수정요청', desc: '수정 필요' },
                  { label: '승인완료', desc: '최종 확정' },
                ].map(s => (
                  <div key={s.label} className="p-2.5 rounded-lg border bg-muted/30 flex-1 min-w-[100px]">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>
            </SubSection>
          </Section>

          {/* ── 캘린더 ── */}
          <Section id="calendar" title="캘린더" icon={CalendarDays}>
            <p>업무 마감일, 회의 일정, 사용자 정의 이벤트를 달력 형태로 조회할 수 있습니다.</p>
            <SubSection title="기능 안내">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>일정 통합 조회</strong> — 업무(마감일), 회의, 커스텀 이벤트를 한 달력에 표시</li>
                <li><strong>일정 추가</strong> — 우측 상단 "일정 추가" 버튼 → 제목, 날짜, 시간, 설명 입력</li>
                <li><strong>날짜 클릭</strong> — 특정 날짜 클릭 시 해당일의 일정 목록 상세 표시</li>
                <li><strong>월 이동</strong> — 좌/우 화살표로 이전/다음 달 이동</li>
                <li><strong>일정 수정/삭제</strong> — 본인 생성 일정 또는 관리자가 수정/삭제 가능</li>
              </ul>
            </SubSection>
            <BadgeLegend items={[
              { label: '업무', color: 'bg-info' },
              { label: '회의', color: 'bg-success' },
              { label: '일정', color: 'bg-accent' },
            ]} />
          </Section>

          {/* ── 파일/자료실 ── */}
          <Section id="library" title="파일/자료실" icon={FolderArchive}>
            <p>사내 문서, 디자인 파일, 계약서 등을 중앙 관리합니다.</p>
            <SubSection title="파일 업로드">
              <Steps items={[
                '"파일 업로드" 버튼 클릭',
                '카테고리 선택 (브랜딩/인증/디자인/계약서/마케팅/견적서 등)',
                '파일 선택 후 "업로드" 클릭',
              ]} />
            </SubSection>
            <SubSection title="파일 관리">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>카테고리 필터링</strong> — 드롭다운으로 특정 카테고리만 조회</li>
                <li><strong>미리보기</strong> — PDF, 이미지 파일은 브라우저 내 미리보기 지원</li>
                <li><strong>다운로드</strong> — 파일 다운로드 버튼으로 직접 다운로드</li>
                <li><strong>삭제</strong> — 관리자만 파일 삭제 가능</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 회의록 ── */}
          <Section id="meetings" title="회의록" icon={Users}>
            <p>회의 기록과 참석자별 업무 현황을 관리합니다.</p>
            <SubSection title="회의 등록">
              <Steps items={[
                '"새 회의 등록" 버튼 클릭',
                '제목, 카테고리, 날짜, 목표, 참석자, 메모 입력',
                '"등록" 버튼 클릭',
              ]} />
            </SubSection>
            <SubSection title="참석자별 업데이트">
              <p>각 참석자가 <strong>완료(Done)</strong>, <strong>할 일(Todo)</strong>, <strong>블로커(Blockers)</strong>를 개별 기록합니다.</p>
            </SubSection>
            <SubSection title="회의록 관리">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>달성 상태</strong> — 완료/진행 중/지연 표시</li>
                <li><strong>회의록 삭제</strong> — 관리자(대표이사, 이사)만 삭제 가능 (확인 대화상자 포함)</li>
                <li>삭제 시 관련 참석자 업데이트는 함께 삭제, 연결된 업무는 보존됨</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 경비관리 ── */}
          <Section id="expenses" title="경비관리" icon={Receipt}>
            <p>경비 청구, 승인, 정산까지의 전체 프로세스를 관리합니다. 사이드바 관리 메뉴에서 접근합니다.</p>
            <SubSection title="경비 청구 (전 직원)">
              <Steps items={[
                '"새 경비 청구" 버튼 클릭',
                '금액, 분류(샘플링/마케팅/일반/출장/장비), 내역 입력',
                '영수증 파일 업로드 (이미지 또는 PDF)',
                '"경비 청구" 버튼 클릭 → 관리자에게 자동 알림 전송',
              ]} />
            </SubSection>
            <SubSection title="경비 승인 (관리자 전용)">
              <Steps items={[
                '경비 목록에서 "대기 중(Pending)" 항목 확인',
                '"승인" 또는 "반려" 버튼 클릭',
                '승인된 경비는 "정산" 버튼으로 정산 처리 가능',
                '상태 변경 시 청구자에게 자동 알림 전송',
              ]} />
            </SubSection>
            <InfoBox title="상태 흐름">
              Pending(대기) → Approved(승인) → Reimbursed(정산 완료) 또는 Rejected(반려)
            </InfoBox>
          </Section>

          {/* ── 매출/KPI ── */}
          <Section id="sales" title="매출/KPI" icon={BarChart3}>
            <p>플랫폼별 매출 데이터와 KPI 지표를 관리합니다. 사이드바 관리 메뉴에서 접근합니다.</p>
            <SubSection title="데이터 입력">
              <Steps items={[
                '"매출 데이터 입력" 버튼 클릭',
                '플랫폼명, 월, 매출, 목표, ROAS, 주문 수 입력',
                '"등록" 클릭',
              ]} />
            </SubSection>
            <SubSection title="조회 가능 지표">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>총 매출 / 총 목표 / 달성률</li>
                <li>평균 ROAS / 총 주문 수</li>
                <li>플랫폼별 매출 비교 차트</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 전자결재 ── */}
          <Section id="approvals" title="전자결재" icon={Stamp}>
            <p>문서 기안, 경비 결재, 프로젝트 제출, 휴가/근태 신청을 처리하는 전자결재 시스템입니다. 사이드바 관리 메뉴에서 접근하며, 모든 직원이 기안을 올릴 수 있습니다.</p>

            <SubSection title="결재 유형">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '문서 기안', desc: '일반 업무 문서 결재' },
                  { label: '경비 결재', desc: '경비 관련 결재 요청' },
                  { label: '프로젝트 제출', desc: '프로젝트 기획/보고' },
                  { label: '휴가/근태 신청', desc: '연차, 반차, 근태 관련' },
                ].map(t => (
                  <div key={t.label} className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="결재 요청 방법">
              <Steps items={[
                '"새 결재 요청" 버튼 클릭',
                '결재 유형, 제목, 내용 입력',
                '결재 라인 자동 생성 확인 (기안자 → 이사 → 대표이사)',
                '"요청 제출" 클릭 → 첫 번째 결재자에게 자동 알림',
              ]} />
            </SubSection>

            <SubSection title="결재 처리 (결재자)">
              <Steps items={[
                '"결재 대기" 탭에서 대기 건 확인 (배지로 건수 표시)',
                '상세 내용 확인 후 "승인" 또는 "반려" 클릭',
                '반려 시 사유 입력 필수',
                '승인 시 다음 결재자에게 자동 이관 / 최종 시 승인 완료 처리',
              ]} />
            </SubSection>

            <InfoBox title="자동 결재 라인">
              결재 라인은 기안자 → 이사 → 대표이사 순으로 자동 구성됩니다.
              이사가 기안할 경우 대표이사만 결재하며, 대표이사는 결재 없이 바로 승인됩니다.
            </InfoBox>
          </Section>

          {/* ── 공지 게시판 ── */}
          <Section id="notices" title="공지 게시판" icon={Megaphone}>
            <p>사내 공지사항을 등록하고 관리합니다. 사이드바 관리 메뉴에서 접근합니다.</p>
            <SubSection title="공지 작성">
              <Steps items={[
                '"공지 작성" 버튼 클릭',
                '제목과 내용 입력',
                '"등록" 클릭 → 관리자에게 자동 알림',
              ]} />
            </SubSection>
            <SubSection title="공지 관리">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>상단 고정(Pin)</strong> — 중요 공지를 목록 상단에 고정</li>
                <li><strong>상세 보기</strong> — 공지 클릭 시 전체 내용 확인</li>
                <li><strong>삭제</strong> — 작성자 또는 관리자가 삭제 가능</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 팀원관리 ── */}
          <Section id="team" title="팀원관리" icon={UserCog}>
            <p>팀원 현황 조회 및 관리 기능입니다. 사이드바 관리 메뉴에서 접근합니다.</p>
            <SubSection title="팀원 현황 (전 직원 조회 가능)">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>이름, 영문명, 직급, 접속 상태(업무 중/자리 비움/오프라인) 확인</li>
                <li>직급 순서로 자동 정렬</li>
              </ul>
            </SubSection>
            <SubSection title="관리자 전용 기능">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>계정 생성</strong> — 이메일, 비밀번호, 이름, 영문명, 직급을 지정하여 신규 계정 생성</li>
                <li><strong>직급 변경</strong> — 드롭다운으로 팀원의 직급을 변경</li>
                <li><strong>계정 삭제</strong> — 팀원 계정 완전 삭제 (확인 대화상자 포함)</li>
              </ul>
            </SubSection>
            <InfoBox title="보안" variant="warning">
              계정 생성 및 삭제는 보안 백엔드 함수를 통해 서버 측에서 처리됩니다.
            </InfoBox>
          </Section>

          {/* ── 알림 시스템 ── */}
          {/* ── 내 프로젝트 (NEW) ── */}
          <Section id="my-projects" title="내 프로젝트" icon={Briefcase}>
            <NewBadge />
            <p>내가 담당하거나 참여 중인 프로젝트만 모아 볼 수 있는 개인 뷰입니다. 사이드바 <strong>더보기 → 내 프로젝트</strong>에서 접근합니다.</p>
            <SubSection title="표시 기준">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>담당자(assignee)</strong>로 지정된 프로젝트</li>
                <li><strong>참여자(participant)</strong>로 포함된 프로젝트</li>
              </ul>
            </SubSection>
            <SubSection title="카드 구성">
              <ul className="list-disc list-inside space-y-1">
                <li>프로젝트명, 단계 뱃지 (Planning, Design, Production 등)</li>
                <li>진행률 바, 담당자 아바타, 마감일</li>
                <li>카드 클릭 시 프로젝트 관리 페이지로 이동</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 내 게시물 (NEW) ── */}
          <Section id="my-posts" title="내 게시물" icon={MessageSquare}>
            <NewBadge />
            <p>내가 작성한 모든 게시물(업무 댓글, 프로젝트 댓글, 공지사항)을 한 곳에서 확인합니다. 사이드바 <strong>더보기 → 내 게시물</strong>에서 접근합니다.</p>
            <SubSection title="통합 조회 항목">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>업무 댓글</strong> — 업무 카드에 남긴 댓글</li>
                <li><strong>프로젝트 댓글</strong> — 프로젝트 상세에 남긴 댓글</li>
                <li><strong>공지사항</strong> — 내가 작성한 공지 게시물</li>
              </ul>
            </SubSection>
            <InfoBox title="팁">
              최신순으로 정렬되며, 각 항목의 유형(업무댓글/프로젝트댓글/공지)이 뱃지로 표시됩니다.
            </InfoBox>
          </Section>

          {/* ── 나를 언급 (NEW) ── */}
          <Section id="mentions" title="나를 언급" icon={AtSign}>
            <NewBadge />
            <p>다른 팀원이 댓글에서 나를 @멘션한 목록을 모아 볼 수 있습니다. 사이드바 <strong>더보기 → 나를 언급</strong>에서 접근합니다.</p>
            <SubSection title="사용 방법">
              <Steps items={[
                '사이드바 "더보기 → 나를 언급" 클릭',
                '나를 @멘션한 댓글이 최신순으로 표시됩니다',
                '작성자 아바타, 이름, 댓글 내용, 작성 시간을 확인할 수 있습니다',
              ]} />
            </SubSection>
            <InfoBox title="참고">
              업무 카드 댓글에서 @를 입력하면 팀원 목록이 나타나며, 선택한 팀원에게 알림이 전송됩니다.
            </InfoBox>
          </Section>

          {/* ── 임시저장 (NEW) ── */}
          <Section id="drafts" title="임시저장" icon={FileEdit}>
            <NewBadge />
            <p>작성 중이던 항목을 저장해두고 나중에 이어서 완성할 수 있습니다. 사이드바 <strong>더보기 → 임시저장</strong>에서 접근합니다.</p>
            <SubSection title="지원 유형">
              <div className="flex flex-wrap gap-2">
                {['업무', '공지사항', '결재', '경비', '회의'].map(t => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
            </SubSection>
            <SubSection title="관리 기능">
              <ul className="list-disc list-inside space-y-1">
                <li>임시저장 목록에서 유형, 제목, 마지막 수정 시간 확인</li>
                <li>불필요한 임시저장은 휴지통 아이콘으로 삭제</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 프로젝트 폴더 (NEW) ── */}
          <Section id="project-folders" title="프로젝트 폴더 관리" icon={Folder}>
            <NewBadge />
            <p>프로젝트를 폴더별로 분류하여 체계적으로 관리합니다. 사이드바 <strong>관리 → 프로젝트 폴더</strong>에서 접근합니다.</p>
            <SubSection title="폴더 생성">
              <Steps items={[
                '"폴더 만들기" 버튼 클릭',
                '폴더명 입력 및 색상 선택 (7가지 색상 중 택 1)',
                '"생성" 버튼 클릭',
              ]} />
            </SubSection>
            <SubSection title="프로젝트 분류">
              <Steps items={[
                '폴더를 클릭하여 펼치기',
                '하단 "프로젝트 추가" 드롭다운에서 미분류 프로젝트 선택',
                '프로젝트가 해당 폴더로 이동됩니다',
                '"폴더 해제" 버튼으로 프로젝트를 미분류로 되돌릴 수 있습니다',
              ]} />
            </SubSection>
            <SubSection title="폴더 관리">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>수정</strong> — 폴더명, 색상 변경 (연필 아이콘)</li>
                <li><strong>삭제</strong> — 폴더 삭제 시 소속 프로젝트는 미분류로 이동 (휴지통 아이콘)</li>
                <li><strong>미분류 프로젝트</strong> — 하단에 별도 섹션으로 표시되며, 폴더 이동 드롭다운 제공</li>
              </ul>
            </SubSection>
          </Section>

          <Section id="notifications" title="알림 시스템" icon={Bell}>
            <p>상단 헤더의 벨 아이콘을 통해 알림을 확인합니다.</p>
            <SubSection title="알림 발생 조건">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>멘션 알림</strong> — 업무 댓글에서 @멘션 시 해당 팀원에게 알림</li>
                <li><strong>업무 배정</strong> — 업무가 나에게 배정될 때 알림</li>
                <li><strong>관리자 알림</strong> — 새 업무 등록, 데일리 로그 작성, 경비 청구, 결재 요청, 공지 등록 시</li>
                <li><strong>결재 알림</strong> — 결재 대기(내 차례), 승인/반려 시</li>
                <li><strong>경비 알림</strong> — 경비 상태 변경 시 청구자에게</li>
              </ul>
            </SubSection>
            <SubSection title="알림 관리">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>벨 아이콘에 읽지 않은 알림 수가 빨간 배지로 표시</li>
                <li>벨 클릭 시 알림 목록 확인 → <strong>확인한 알림은 자동 삭제</strong></li>
                <li>실시간 동기화 — 새 알림 발생 시 즉시 반영</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── 권한 체계 ── */}
          <Section id="roles" title="권한 체계" icon={Shield}>
            <p>6단계 직급 체계에 따라 기능 접근 권한이 차등 부여됩니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">직급</th>
                    <th className="text-left py-2 pr-4 font-semibold">영문</th>
                    <th className="text-left py-2 font-semibold">주요 권한</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    { kr: '대표이사', en: 'CEO', perm: '모든 권한, 계정/역할 관리, 최종 결재' },
                    { kr: '이사', en: 'General Director', perm: '대표이사와 동일한 관리 권한' },
                    { kr: '부장', en: 'Deputy GM', perm: '결재 처리, 일반 업무 수행' },
                    { kr: '차장', en: 'MD', perm: '결재 처리, 일반 업무 수행' },
                    { kr: '대리', en: 'Designer', perm: '일반 업무 수행, 결재/경비 요청' },
                    { kr: '사원', en: 'Staff', perm: '일반 업무 수행, 결재/경비 요청' },
                  ].map((r, i) => (
                    <tr key={r.en} className={i < 5 ? 'border-b border-border/50' : ''}>
                      <td className="py-2 pr-4 font-medium text-foreground">{r.kr}</td>
                      <td className="py-2 pr-4">{r.en}</td>
                      <td className="py-2">{r.perm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox title="관리자 vs 일반 사용자" variant="warning">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>관리자</strong> (대표이사, 이사): 계정 생성/삭제, 역할 변경, 경비 승인, 파일 삭제, 프로젝트 삭제, 회의록 삭제</li>
                <li><strong>일반 사용자</strong>: 업무/프로젝트 관리, 디자인 시안 피드백, 결재/경비 요청, 공지 작성, 데일리 로그</li>
              </ul>
            </InfoBox>
          </Section>

        </div>
      </div>
    </div>
  );
}

/* ── 재사용 컴포넌트 ── */

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
        <ChevronRight className="h-3.5 w-3.5 text-primary" />
        {title}
      </h4>
      <div className="pl-5">{children}</div>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function InfoBox({ title, children, variant = 'info' }: { title: string; children: React.ReactNode; variant?: 'info' | 'warning' }) {
  const styles = variant === 'warning'
    ? 'bg-warning/5 border-warning/20'
    : 'bg-primary/5 border-primary/20';
  return (
    <div className={`rounded-lg border p-3 ${styles}`}>
      <p className="text-xs font-semibold mb-1">{variant === 'warning' ? '⚠️' : 'ℹ️'} {title}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function BadgeLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function NewBadge() {
  return <Badge className="bg-success text-success-foreground text-[10px] mb-2">NEW</Badge>;
}
