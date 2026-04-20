

## 변경 요청
체크인/체크아웃 기능 자체를 완전히 제거. 데일리 체크인 탭도 삭제. 업무 관리는 칸반/간트만 남긴다.

## 최종 통합 계획

### 페이지 구조 (`/tasks` 단순화)

```text
┌─ 헤더: "업무 관리"
│   ├─ [디자인 의뢰하기]
│   └─ [+ 새 업무 등록]
│
└─ 메인 탭
    ├─ 📋 칸반 보드
    └─ 📊 간트차트
```

### 삭제 항목
1. **업무 탭의 데일리 로그 탭** (자유 메모형) — state/핸들러/다이얼로그 모두 제거
2. **데일리 체크인/체크아웃 기능 전체**
   - 체크인/체크아웃 버튼 및 핸들러
   - 오늘 업무 스냅샷 로직
   - 4단계 승인 플로우 (이미 이전 단계에서 제거 합의)
   - 6가지 뷰 (타임라인/담당자별/현황표/주간/월간/연간)
   - 코멘트, 이모지 반응 (데일리 보고 한정)
   - 날짜 네비게이션
   - `linked_task_id` 양방향 동기화 로직
3. **`src/pages/DailyWorkReport.tsx`** 파일 삭제
4. **사이드바 "데일리 체크인" 메뉴** 제거 (`AppSidebar.tsx`)
5. **`/daily-report` 라우트** — `/tasks`로 리다이렉트
6. 관련 알림 호출 (데일리 보고 작성/승인 알림)

### 보존 항목
- 칸반 보드, 간트차트 (기존 그대로)
- 업무 등록/수정/삭제, 디자인 의뢰
- 업무 댓글, 멘션, 상태 변경 히스토리
- `tasks` 테이블 자체 (변경 없음)

### DB 처리
- `daily_work_reports` 테이블은 **보존** (과거 데이터 보호)
- 신규 쓰기 없음, UI에서 노출 안 함
- 마이그레이션 불필요 (추후 정리는 별도 요청 시)

### 라우팅
- `/daily-report` → `<Navigate to="/tasks" replace />`
- 사이드바에서 "데일리 체크인" 항목 삭제

### 영향 범위
- **수정**: `src/pages/Tasks.tsx` (데일리 로그 탭만 제거), `src/components/layout/AppSidebar.tsx`, `src/App.tsx`
- **삭제**: `src/pages/DailyWorkReport.tsx`
- **DB**: 변경 없음 (`daily_work_reports` 테이블은 미사용 상태로 잔존)

### 구현 단계
1. `Tasks.tsx`에서 데일리 로그 관련 state, 핸들러, 탭, 다이얼로그 제거 → 칸반/간트 2개 탭만 유지
2. `AppSidebar.tsx`의 `mainNavItems`에서 "데일리 체크인" 항목 제거
3. `App.tsx`에서 `/daily-report` 라우트를 `/tasks`로 리다이렉트, `DailyWorkReport` import 제거
4. `src/pages/DailyWorkReport.tsx` 파일 삭제
5. 관련 메모리 업데이트 (`mem://features/daily-work-report` → 폐기 표시 또는 제거)

