
# MD별 채널 행사 현황 관리

담당 MD가 자기 채널의 품목별 행사(프로모션)를 등록하고, 전 직원이 전체 현황을 열람하며, 가격 정책 위반 시 자동으로 경고를 표시하는 새 모듈을 추가합니다.

## 신규 페이지: `/promotions` (행사 현황)

세 개 탭으로 구성:

1. **현황판(대시보드)** — 진행중/예정/종료 카운트, 채널별·MD별 요약, 정책 위반 경고 리스트
2. **행사 목록** — 필터·검색이 되는 표(엑셀 느낌), 인라인 상태 변경
3. **캘린더** — 행사 기간을 월간 뷰로 표시(제품별 색상)

관리자(대표/제너럴 디렉터)는 상단에 "채널 관리" · "가격 정책" 버튼이 추가로 노출됩니다.

## 데이터 모델(신규 테이블)

- **sales_channels** — 채널 마스터(이름, 유형: online/offline, 담당 MD 기본값, 활성 여부). 담당 MD/관리자가 직접 등록·수정.
- **channel_price_policies** — 품목 × 채널의 최소가/최대가 정책(선택). 관리자만 설정.
- **promotions** — 행사 본문
  - 품목(products FK), 채널(sales_channels FK), 담당 MD(profiles FK)
  - 행사 기간(시작·종료일), 정상가/행사가/할인율(자동 계산)
  - 프로모션 유형(쿠폰/딜/기획전/라방/타임세일/기타), 노출 위치(메인/카테고리 상단 등 자유 입력)
  - 물량(계획), 재고, 예상 매출, 실제 매출
  - 경쟁사가, 시장 최저가, 모니터링 메모
  - 상태(planned/ongoing/ended/cancelled) — 날짜 기반 자동 계산 + 수동 override
  - 첨부/비고

정책 위반 판정은 DB 함수 `check_promotion_conflicts(promotion_id)`로 계산해 목록·상세에 노출:
- 동일 품목·기간 중복 채널 존재 시 → 채널별 행사가 차이 표시(정보성)
- 정책 최소가 미만 / 최대가 초과 → 경고 배지
- 등록·수정 시에도 경고를 띄우되 저장은 허용(관리자 승인 개념 없이 가시성 위주)

## 권한

- **열람**: 로그인한 모든 직원(전체 채널·MD 데이터)
- **등록/수정**: 본인이 담당 MD인 행사 + 관리자(ceo, general_director, deputy_gm)
- **삭제**: 담당 MD 본인 또는 관리자
- **채널·가격 정책 관리**: 관리자만

RLS는 `has_role` 및 `promotions.md_id = 내 profile.id` 조건으로 구현. 모든 신규 public 테이블은 GRANT 포함.

## 사이드바 & 라우팅

- 사이드바 "영업" 그룹(또는 매출 근처)에 **행사 현황** 항목 신설
- `App.tsx`에 `/promotions` 라우트 추가
- 대시보드에 "이번주 진행중 행사" 위젯 1개 추가(상위 5건 + 위반 건수)

## UI 컴포넌트 구성

```
src/pages/Promotions.tsx
src/components/promotions/
  PromotionDashboard.tsx       # 요약 카드 + 위반 알림
  PromotionTable.tsx           # 필터/검색/정렬 가능한 표
  PromotionCalendar.tsx        # 월간 캘린더
  PromotionDialog.tsx          # 등록/수정 다이얼로그(정책 위반 실시간 경고)
  ChannelManageDialog.tsx      # 관리자 전용 채널 CRUD
  PricePolicyDialog.tsx        # 관리자 전용 정책 설정
```

기존 디자인 시스템(SectionCard, StatusBadge, PageHeader, Cloud White 팔레트) 그대로 사용.

## 기술 세부

- **상태 자동 계산**: `promotions.status`는 트리거로 `start_date/end_date`와 `now()` 비교해 planned/ongoing/ended로 갱신(수동으로 cancelled 지정 시 유지).
- **할인율 자동 계산**: `regular_price`, `promo_price`에서 파생 컬럼 또는 클라이언트 계산.
- **정책 위반 뷰**: `promotion_violations` SQL 뷰로 표에서 join하여 표시.
- **알림**: 정책 위반이 있는 행사가 저장되면 관리자에게 `send_notifications` 호출로 알림 발송.
- **엑셀 내보내기**: 목록 탭에 CSV 다운로드 버튼(클라이언트 측 변환).
- 대시보드 위젯은 `Dashboard.tsx`에 카드 하나 추가.

## 마이그레이션 순서

1. `sales_channels`, `channel_price_policies`, `promotions` 테이블 생성 + GRANT + RLS + 정책
2. 상태 자동 계산 트리거, 정책 위반 뷰
3. 시드: 기본 채널(쿠팡/네이버/11번가/카카오/자사몰 등)은 사용자가 직접 등록하므로 빈 상태로 시작

## 범위 밖(추후)

- 자동 크롤링 기반 경쟁사가 수집
- 채널 API 연동으로 실제 매출 자동 수집
