## 칭찬·감사 보드(Kudos) 제거

### 삭제 대상
- `src/pages/Kudos.tsx` — 페이지 컴포넌트
- `src/components/dashboard/KudosWeeklyTopWidget.tsx` — 대시보드 위젯

### 수정 대상
- `src/App.tsx` — `Kudos` import 및 `/kudos` 라우트 제거
- `src/pages/Dashboard.tsx` — `KudosWeeklyTopWidget` import 및 렌더링 제거
- `src/components/layout/AppSidebar.tsx` — Kudos 사이드바 메뉴 항목 제거

### DB
- `public.kudos` 테이블 DROP (관련 정책·GRANT 포함)

### 유지
- `profiles.manager_id` 컬럼과 `one_on_one_feedback`(1:1 피드백)은 그대로 둡니다. 함께 지울지 확인 필요하면 알려주세요 — 기본은 유지.
