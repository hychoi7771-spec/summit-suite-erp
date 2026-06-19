# 업무 자산 라이브러리 (Work Asset Library)

완료된 업무 데이터를 카테고리별로 모아 향후 업무의 자산이 되도록 하는 기능입니다. **완료된 업무(Tasks) · 일일업무보고 · 승인된 전자결재** 3개 영역을 각각 별도 자산함으로 구성하고, 검색·템플릿 복제·통계·AI 요약을 제공합니다.

## 1. 신규 페이지 구성 (사이드바)

```text
업무 자산함  (신규 그룹)
├─ 📋 업무 자산함        /assets/tasks
├─ 📝 일일보고 자산함    /assets/daily-reports
└─ 📑 결재문서 자산함    /assets/approvals
```

각 페이지는 동일한 패턴:
```text
┌──────────────────────────────────────────────┐
│  [카테고리 필터 칩] [기간] [담당자] [검색]   │
├──────────────────────────────────────────────┤
│  📊 통계 바  카테고리별 건수 · 평균 소요일 · │
│              담당자 TOP3 · 월별 추이 미니차트│
├──────────────────────────────────────────────┤
│  [AI 요약 보기]  ← 현재 필터 결과 요약       │
├──────────────────────────────────────────────┤
│  카드 리스트 (카테고리 색상 좌측 보더)       │
│   · 제목 / 요약 / 태그 / 담당자 / 완료일     │
│   · [상세 보기] [템플릿으로 복제]            │
└──────────────────────────────────────────────┘
```

## 2. 영역별 동작

### 2-1. 업무 자산함 (`/assets/tasks`)
- 데이터: `tasks.status='done'`
- 카테고리: 기존 `task_categories` 그대로 활용
- "템플릿으로 복제" → `/tasks` 페이지로 이동하며 새 task 생성 다이얼로그가 제목·설명·카테고리·태그·체크리스트가 채워진 채 열림 (담당자·일정은 비움)

### 2-2. 일일보고 자산함 (`/assets/daily-reports`)
- 데이터: `daily_work_reports` 전체 (최종 승인된 건 우선)
- 카테고리: 보고서가 가진 `category` 컬럼(없으면 보고 작성자의 직무/프로젝트 태그로 그룹핑)
- "유사 보고 작성" → `/daily-reports` 페이지에서 해당 보고를 베이스로 새 보고 작성

### 2-3. 결재문서 자산함 (`/assets/approvals`)
- 데이터: `approvals.status='approved'`
- 카테고리: 기존 `approval_category` (기획안/행사안/구매/계약/출장/일반/경비/휴가)
- "이 문서를 템플릿으로" → `/approvals` 새 결재 작성 화면에 본문·첨부 메타가 채워진 채 열림

## 3. 공통 컴포넌트
- `AssetLibraryShell` — 필터 바 + 통계 바 + AI 요약 패널 + 카드 그리드 공용 레이아웃
- `AssetStatsBar` — 카테고리별 건수, 평균 소요일, 담당자 분포, 월별 12개월 미니 라인차트 (recharts)
- `AssetCard` — 카테고리 색상 보더 + 메타 + 액션 버튼
- `AssetAISummaryPanel` — Lovable AI Gateway(`google/gemini-2.5-flash`) 호출 → 현재 필터 결과 요약 + 패턴/인사이트 추천
- `useAssetSearch(source)` — 통합 검색 훅 (제목·본문·태그·담당자)

## 4. 백엔드/DB
**스키마 변경 없음.** 기존 테이블을 그대로 조회합니다.
- 신규 Edge Function: `summarize-assets`
  - 입력: `{ source: 'tasks'|'daily_reports'|'approvals', items: [{id,title,summary,category}...] }`
  - 출력: `{ overview, patterns: [], recommendations: [] }`
  - 모델: `google/gemini-2.5-flash` (자산 양이 많을 수 있으므로 상위 50건만 요약 컨텍스트에 포함)
- RLS: 자산함은 **본인 + 관리자(ceo/general_director/deputy_gm)** 가 접근. 일반 사원은 본인이 참여한 건만 노출되도록 클라이언트 필터링.

## 5. 권한
- 모든 직원: 본인 관련 자산 + 회사 공통 자산 열람
- 관리자(ceo/general_director/deputy_gm): 전체 열람 + 카테고리별 통계
- "템플릿 복제"는 본인이 작성 권한 있는 영역에서만 활성화

## 6. 디자인
- 기존 Cloud White 팔레트 + 카테고리 색상 보더 + Sora/Manrope 폰트 유지
- 통계 미니차트는 단색 라인(블루 #3b82f6), AI 요약 패널은 연한 블루 배경(`bg-blue-50/40`)

## 7. 진입 동선
- 사이드바 신규 그룹 "업무 자산함" 추가
- 각 원본 페이지(Tasks·DailyReports·Approvals)에 "자산함 보기" 링크 추가
- 대시보드에 "최근 자산화된 문서 5건" 위젯(선택) — 1차에서는 제외

## 8. 구현 순서
1. 사이드바 그룹 추가 + 3개 라우트 스텁
2. `AssetLibraryShell` + `AssetCard` + `AssetStatsBar` 공통 컴포넌트
3. Tasks 자산함 (가장 단순) → DailyReports → Approvals 순으로 데이터 연결
4. "템플릿 복제" 액션 (각 페이지 prefill 처리)
5. `summarize-assets` Edge Function + AI 요약 패널
6. 권한 가드 및 빈 상태 UI

## 변경하지 않는 것
- 기존 Tasks/DailyReports/Approvals 페이지 UX
- DB 스키마 (테이블·컬럼 추가 없음)
- 카테고리 관리 화면 (`task_categories`, `approval_categories`)
