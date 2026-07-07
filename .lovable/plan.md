
# 행사 등록 통합 + 현황판 개선

## 1. 업무 카테고리 "행사" 신설 → 업무·행사 동시 등록

- **DB**
  - `task_categories`에 시스템 카테고리 `promotion` 시드 (기본 색상/아이콘 지정, 삭제 불가 플래그로 보호)
  - `tasks.promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL` 추가
  - `promotions.task_id uuid REFERENCES tasks(id) ON DELETE SET NULL` 추가
  - 양방향 동기화 트리거: promotion 삭제 → 연결된 task도 삭제(옵션), task 삭제 → promotion `task_id`만 NULL 처리

- **UI: 업무 등록 다이얼로그**
  - 카테고리로 "행사"를 선택하면 다이얼로그가 확장되어 채널·MD·행사가·기간·유형 필드를 함께 노출
  - 저장 시 promotion을 먼저 insert → 반환된 id를 `tasks.promotion_id`에 저장 → task insert
  - 수정 시 promotion 우선 update, task는 title/dates/assignee만 동기화
  - 기존 promotion에 딸린 task는 업무 목록에서 "행사 아이콘"과 함께 표시, 클릭 시 통합 다이얼로그로 진입

- **UI: 행사 다이얼로그**
  - 저장 후 연결된 task가 없으면 자동 생성 옵션 체크박스("업무 목록에도 등록") 기본 ON, 저장 시 task도 함께 생성/갱신

- **중복 방지**
  - 같은 promotion에 대한 task는 1건만 유지(1:1). 이미 연결된 task가 있으면 재사용
  - task 목록/간트에서 카테고리 "행사"인 항목은 promotion 상태(예정/진행/종료) 배지를 함께 표기

## 2. 카카오 단체 일정 연동

이번 라운드에서는 스킵합니다. 추후 구글 캘린더 미러링 방식으로 별도 논의.

## 3. 현황판 개선 — 타임라인/간트 + MD×채널 매트릭스

기존 요약 4카드는 유지하고, 현황판 탭 본문을 두 개 뷰로 재구성합니다.

### A. 타임라인/간트 뷰 (기본)

- 세로축: 채널(활성 채널만, 진행중 건수 내림차순)
- 가로축: 오늘 기준 −7일 ~ +28일 (스크롤 가능, 5주 창)
- 각 행에 promotion을 가로 막대로 렌더. 막대 색상:
  - 정상 진행: 채널별 파스텔
  - 정책 위반: 붉은 테두리 + 경고 아이콘
  - 저가 겹침: 앰버 사선 패턴
- 오늘 위치에 세로 가이드 라인
- 막대 hover: 품목/MD/행사가/할인율 툴팁, 클릭 시 편집 다이얼로그
- 상단 필터: MD, 채널 유형(온·오프), 상태

### B. MD × 채널 매트릭스

- 행: MD, 열: 채널
- 각 셀:
  - 상단: 진행중 건수 · 예정 건수
  - 하단: 정책 위반 있으면 붉은 점, 저가 겹침이면 앰버 점
- 셀 클릭 시 목록 탭으로 이동하며 해당 MD·채널 필터 자동 적용

### 시각 정돈

- 기존 "담당 MD별", "채널별", "가격 정책 위반", "채널 간 가격 겹침" 4개 리스트 카드는 제거하고, 정책 위반·저가 겹침은 타임라인 막대와 매트릭스 셀 표시로 통합
- 위반/겹침 상세는 매트릭스 위 얇은 알림 스트립 하나("정책 위반 N건 · 저가 겹침 M건 — 자세히 보기") + 클릭 시 목록 탭으로 필터 이동

## 파일 변경

**신규**
- `src/components/promotions/PromotionTimeline.tsx`
- `src/components/promotions/PromotionMatrix.tsx`

**수정**
- `src/components/promotions/PromotionDashboard.tsx` — 위 두 뷰로 재구성, 뷰 토글
- `src/components/promotions/PromotionDialog.tsx` — task 동시 생성 체크박스 + 저장 로직
- `src/components/tasks/TaskDetailDialog.tsx` (또는 등록 다이얼로그) — "행사" 카테고리 감지 시 행사 필드 확장
- `src/pages/Promotions.tsx` — 대시보드 필터 상태를 목록 탭으로 넘기는 훅

**마이그레이션**
- promotion/task 상호 FK 추가
- `task_categories`에 `promotion` 시드
