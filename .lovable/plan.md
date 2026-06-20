## 목표
대표/총괄이사가 **회사 전체 상태를 한 화면에서 진단하고, 그 자리에서 지시·통제**할 수 있는 `/executive` 페이지를 신설합니다. 기존 직원용 대시보드와 분리하여 임원 전용 KPI·이상신호·액션을 집약합니다.

## 접근 제어
- 라우트: `/executive` (사이드바 메뉴 **"경영현황"**, 왕관 아이콘)
- `has_role(uid, 'ceo')` 또는 `has_role(uid, 'general_director')`만 접근. 그 외 사용자는 메뉴 노출 안 됨 + 라우트 가드로 차단.

## 화면 구조 (1페이지 스크롤)

```text
┌─ 상단 헤더 ──────────────────────────────────────────────┐
│ 경영현황   [기간: 오늘/주/월/분기]  [부서필터]  [새로고침] │
├─ ① 헤드라인 KPI (6장 카드) ─────────────────────────────┤
│ 매출(MTD) │ 진행중 프로젝트 │ 지연업무 │ 대기결재 │      │
│ 출근률    │ 미결 경비       │  + 전기 대비 ↑↓%           │
├─ ② 경영진단 패널 (이상신호 자동 감지) ──────────────────┤
│  • 마감 임박/초과 업무 TOP, 7일+ 정체 프로젝트            │
│  • 평균 결재 소요시간 초과 건                              │
│  • 예산 대비 경비 초과 카테고리                            │
│  → 각 항목 [지시하기] [담당자 호출] [상세] 버튼             │
├─ ③ 4분면 모니터링 ──────────────────────────────────────┤
│ A. 인력/근태              B. 업무/프로젝트                  │
│  - 오늘 출근/휴가/외근     - 카테고리별 진행률 막대          │
│  - 부서별 인원 도넛        - 마일스톤 임박 타임라인          │
│  - 월 연차 소진율          - 담당자별 워크로드 히트맵        │
│                                                              │
│ C. 매출/재무/경비          D. 결재/의사결정                  │
│  - 월 매출 추세 라인       - 내 결재 대기                    │
│  - 채널별 매출 도넛        - 회사 전체 결재 적체(7일+)       │
│  - 경비 카테고리 Top5      - 평균 처리시간/승인률             │
│  - 미결/반려 경비          - 회의록 액션아이템 미완료          │
├─ ④ 지시·컨트롤 센터 (Quick Action Bar, sticky) ────────┤
│ [긴급공지 발행] [전사 푸시] [업무 지시 생성]               │
│ [회의 즉시 소집] [결재 일괄 위임/독촉] [직원 멘션]         │
└──────────────────────────────────────────────────────────┘
```

## 주요 위젯 사양

**① 헤드라인 KPI** — 카드별 현재값, 전기간 대비 증감%, 클릭 시 해당 모듈 진입.

**② 경영진단(AI/규칙 기반 이상신호)**
- 규칙: 마감 초과 task, status='in_progress'인데 7일 무변경, approval 대기 48h+, 월 경비 카테고리가 직전월 +30%, 결재라인 정체.
- 각 행에 **[지시하기]** 클릭 → 다이얼로그에서 담당자·내용 입력 → `tasks` insert + 알림.

**③ A 인력/근태** — `profiles`+`leave_requests`+`attendance` 조회, recharts 도넛/막대.
**③ B 업무/프로젝트** — `tasks` 카테고리·상태·due_date 집계. 워크로드 히트맵(담당자×주).
**③ C 매출/재무/경비** — `sales_data` 월별, `expenses` 카테고리·상태·결제수단별.
**③ D 결재/의사결정** — `approvals` 평균 처리시간, 적체 리스트, `meetings.action_items` 미완료.

**④ 컨트롤 센터(풀 컨트롤)**
- 긴급공지: `notices` insert (pinned=true) + `send_notifications` 전사 호출.
- 업무 지시: `tasks` insert + 담당자 알림 (카테고리 자동분류 edge function 재사용).
- 결재 독촉: 적체 approval에 대해 현재 결재자에게 알림 발송.
- 회의 즉시 소집: `meetings` insert(오늘, 참석자 선택) + 캘린더 이벤트.

## 기술 구현

**파일 추가**
- `src/pages/Executive.tsx` — 메인 페이지
- `src/components/executive/` — `KpiCards.tsx`, `DiagnosticsPanel.tsx`, `WorkforceQuadrant.tsx`, `TasksQuadrant.tsx`, `FinanceQuadrant.tsx`, `ApprovalsQuadrant.tsx`, `ControlBar.tsx`, `QuickInstructDialog.tsx`, `BroadcastNoticeDialog.tsx`
- `src/hooks/useExecutiveStats.ts` — 모든 쿼리 집계 React Query 훅

**라우팅/메뉴**
- `src/App.tsx`: `/executive` 라우트 추가 + RoleGuard(ceo/general_director).
- `src/components/AppSidebar.tsx`: 메뉴 항목 추가, 역할 체크로 조건부 렌더.

**DB**
- 스키마 변경 없음. 기존 `tasks/approvals/expenses/sales_data/leave_requests/profiles/notices/meetings` 집계만 사용.
- 무거운 집계는 RPC로 분리 고려 (옵션): `executive_overview()` security definer 함수 1개 추가 가능 (1차 버전은 클라이언트 집계로 시작).

**차트**: 기존 `recharts` 사용. **상태**: `@tanstack/react-query` (15초 stale). **디자인**: 기존 Cloud White 토큰, 카드 radius 0.75rem, 위젯 헤더 Sora.

## 범위 외 (이번 버전 미포함)
- 실시간 WebSocket 푸시(폴링/리프레시 버튼으로 대체)
- 외부 BI 연동, PDF 보고서 자동 발송 (다음 단계)
