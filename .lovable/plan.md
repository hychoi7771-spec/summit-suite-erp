# 1·2단계 실행 플랜 — UX/UI 통일 + 협업 강화

## 1단계 — UX/UI 가독성·일관성

### 1.1 공용 컴포넌트 신설 (`src/components/shared/`)
- **`EmptyState.tsx`** — 아이콘 + 제목 + 설명 + CTA 버튼. 톤(블루/슬레이트/앰버) 지원
- **`PageSkeleton.tsx`** — 헤더+카드+테이블 패턴별 스켈레톤 (variant: `dashboard | list | board | detail`)
- **`SectionCard.tsx`** — 페이지 내부 섹션 통일 래퍼(헤더+본문, optional 액션)

### 1.2 기존 페이지에 적용
대상: Tasks, Approvals, Expenses, Sales, Notices, Meetings, Library, Surveys, MyProjects, Mentions, Drafts, MyPosts, StockAlerts
- 데이터 0건일 때 `<EmptyState />`로 교체
- 로딩 중 `<PageSkeleton variant=... />`로 교체
- 페이지별 임시 회색 박스/로딩 텍스트 제거

### 1.3 모바일 반응형 점검
- `AppSidebar`: 모바일에서 Sheet로 열리는지 확인, 햄버거 위치 보정
- 테이블이 있는 페이지(Sales, Expenses, Attendance): `overflow-x-auto` 래퍼 일관 적용
- 결재/업무 카드: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` 통일
- `h-screen` → `h-dvh` 일괄 교체 (모바일 뷰포트 안전)

### 1.4 글로벌 단축키 팔레트 (⌘K)
- 신규: `src/components/shared/CommandPalette.tsx` (cmdk + shadcn Command)
- `AppLayout`에 마운트, `⌘K / Ctrl+K`로 토글
- 항목: 모든 페이지 이동(라우트 메타), "새 업무", "새 결재", "새 경비", "공지 작성"
- 로그인 사용자 권한 기반 필터링

### 1.5 글로벌 검색
- 헤더(`AppLayout`) 우측에 검색 입력 추가 — 클릭 시 ⌘K 팔레트 검색 모드 열기 (같은 UI 재사용)
- 검색 대상: 업무 제목, 결재 제목, 공지 제목, 자료실 파일명 (Supabase RPC 1개 추가)
- DB: `RPC public.global_search(q text)` — 4개 테이블 UNION ALL, 결과 20개 제한

---

## 2단계 — 커뮤니케이션·협업 강화

### 2.1 멘션 알림 강화
- `task_comments`, `notice_comments` 등 댓글 작성 시 `@닉네임` 추출 → `notifications` insert
- 댓글 입력창에 멘션 자동완성 드롭다운(`MentionTextarea.tsx` 신설, `profiles`에서 매칭)
- 알림 목록에서 멘션 알림 별도 아이콘/색상

### 2.2 반응(이모지) 확장
- 신규 테이블 `public.reactions` — `(target_type, target_id, user_id, emoji)`
  - 인덱스: `(target_type, target_id)`
  - RLS: 본인 추가/삭제, 전체 읽기(authenticated)
- 공용 컴포넌트 `ReactionBar.tsx` — 👍❤️🎉😄🙏 5종, 카운트+토글
- 적용: Tasks 상세, Approvals 상세, Notices 상세 (기존 `EmojiReactionBar` 데일리로그용은 유지)

### 2.3 칭찬·감사 보드 (Kudos)
- 신규 테이블 `public.kudos` — `from_user_id, to_user_id, message, category(감사/협업/창의/성장), created_at`
- 신규 페이지 `src/pages/Kudos.tsx` — 카드형 피드, 작성 모달
- 사이드바 "Workspace" 그룹에 메뉴 추가 (라우트 `/kudos`)
- 대시보드 위젯 `KudosWeeklyTopWidget.tsx` — 이번 주 받은 칭찬 Top 3 표시

### 2.4 1:1 피드백 채널
- 신규 테이블 `public.one_on_one_feedback` — `manager_id, member_id, content, visibility('private'|'shared'), created_at`
  - RLS: manager 또는 member 본인만 조회, private는 작성자만, shared는 양쪽 모두
- 신규 페이지 `src/pages/OneOnOne.tsx` — 직속상사·본인 사이 비공개 피드백 타임라인
- 사이드바 "Personal" 그룹에 메뉴 추가
- 직속상사 정의: `profiles.manager_id` 컬럼 활용(없으면 추가 마이그레이션 포함)

### 2.5 알림 시스템 확장
- `notifications` 테이블에 `category` 컬럼 추가 (mention / reaction / kudos / feedback / approval / general)
- 알림 드롭다운에 카테고리 필터 탭

---

## 진행 순서 및 마일스톤

1. **M1 — 공용 컴포넌트 + 적용** (1.1~1.3): UI 즉시 체감, DB 변경 없음
2. **M2 — 단축키/글로벌 검색** (1.4~1.5): RPC 1개 추가
3. **M3 — 멘션·반응** (2.1~2.2): `reactions` 테이블 + 알림 로직
4. **M4 — Kudos + 1:1 피드백** (2.3~2.4): 신규 2개 페이지·테이블
5. **M5 — 알림 카테고리화** (2.5): 마무리 정돈

각 마일스톤 후 자연스러운 중단점이 있어 크레딧 관리하며 멈춰도 일관성 유지됩니다.

---

## 기술 메모

- 모든 신규 public 테이블은 RLS + GRANT + 정책 4단계 구조 준수
- AI 호출 없음 (1·2단계는 토큰 절약 위해 의도적으로 AI 미사용)
- 디자인 토큰: `index.css`의 Cloud White 팔레트 그대로 사용, 하드코딩 색상 금지
- 단축키 라이브러리: `cmdk` (이미 설치됨)

승인 후 M1부터 순차 실행합니다.
