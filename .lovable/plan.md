

## 업무 관리 효율화 — 단계적 도입 (추천안)

복잡도를 최소화하면서 즉시 효과가 큰 **Phase 1만 먼저** 진행하는 것을 추천합니다. 운영해보고 부족한 부분을 Phase 2~4로 점진적으로 추가하면 학습 비용 없이 안착시킬 수 있습니다.

### 추천 이유

- **즉시 가시성 개선**: 카테고리 칩 + 화면 정리 토글만으로도 135개 업무가 한눈에 분류됨
- **데이터 이전 부담 없음**: 카테고리는 nullable로 시작 → 기존 업무는 천천히 분류
- **학습 곡선 낮음**: 새 개념 1개(카테고리) + 토글 3개만 추가
- **확장 가능**: 이후 라벨·스마트 뷰·완료 단계 세분화는 데이터 누적 후 필요 시 도입

---

### Phase 1 — 즉시 도입 (이번 작업 범위)

#### 1. 카테고리(Category) 시스템

`tasks` 테이블에 `category` 컬럼 추가. 기본 카테고리 6종:

- 🚀 **런칭 준비** — 신제품 출시 관련
- 🎨 **디자인** — 시안·패키지·SNS
- 📦 **생산/발주** — 공장·자재·재고
- 📋 **인허가** — 인증·서류
- 💰 **온라인 이커머스 MD** — 와디즈·카카오메이커스·자사몰·플랫폼 입점·광고·판매·제휴
- 🛠 **운영/기타** — 사내 잡무

관리자가 자유롭게 카테고리 추가/편집(이름·아이콘·색상). 칸반 카드 좌측 색상 막대로 구분.

#### 2. 카테고리 요약 바 (보드 상단)

```text
🚀 런칭(12)  🎨 디자인(8)  📦 생산(5)  📋 인허가(3)  💰 이커머스 MD(7)  🛠 운영(15)
[지연 4건] [이번 주 마감 9건]
```

칩 클릭 → 해당 카테고리만 필터. 한 번 더 클릭 → 해제.

#### 3. 화면 정리 토글 (툴바)

상단에 토글 4개, 사용자별 `localStorage` 저장:

- ☐ **완료 숨기기** (기본 ON)
- ☐ **컴팩트 모드** — 카드 높이 절반
- ☐ **내 업무만**
- ☐ **지연된 업무만**

#### 4. 통합 검색창

제목·설명·태그·프로젝트명 통합 검색 (디바운스 300ms).

---

### Phase 2~4 (이후 필요 시)

- **Phase 2**: 완료 → 종결 → 아카이브 3단계 + 자동 전환
- **Phase 3**: 스마트 뷰 (저장 가능한 필터) + 그룹화 모드 전환 (카테고리별/담당자별/마감일별)
- **Phase 4**: 라벨 시스템 + 검색 고도화

---

### 기술 메모

```text
DB:
  CREATE TABLE task_categories (
    id uuid PK default gen_random_uuid(),
    name text not null,
    icon text,
    color text,
    sort_order int default 0,
    created_at timestamptz default now()
  );
  -- 기본 6개 카테고리 시드 데이터 INSERT

  ALTER TABLE tasks ADD COLUMN category_id uuid REFERENCES task_categories(id);
  CREATE INDEX idx_tasks_category_id ON tasks(category_id);

RLS:
  task_categories: 전체 조회 가능, 관리자만 INSERT/UPDATE/DELETE

UI 상태:
  localStorage 'task-board-toggles' → { hideDone, compact, myOnly, overdueOnly }
  URL 쿼리스트링 ?category=<id> 동기화 (공유 가능한 필터 링크)

카테고리 색상 매핑:
  카드 좌측 4px 컬러 막대 + 카테고리 칩 배경색
```

### 변경 파일

- `supabase/migrations/...` — `task_categories` 테이블 + `category_id` 컬럼 + 시드 데이터 + RLS
- `src/pages/Tasks.tsx` — 카테고리 바, 토글 툴바, 검색창 통합
- `src/components/tasks/CategoryBar.tsx` (신규) — 카테고리 칩 + 카운트
- `src/components/tasks/TaskFilterToolbar.tsx` (신규) — 토글 4종 + 검색
- `src/components/tasks/TaskCard.tsx` — 좌측 컬러 막대, 컴팩트 모드 대응
- `src/components/tasks/TaskDetailDialog.tsx` — 카테고리 선택 드롭다운
- `src/components/tasks/CategoryManageDialog.tsx` (신규, 관리자 전용) — 카테고리 CRUD
- `src/components/tasks/GanttChart.tsx` — 카테고리 색상·필터 연동
- `mem://features/task-management` — 카테고리 시스템 메모 업데이트

승인하시면 마이그레이션부터 진행합니다.

