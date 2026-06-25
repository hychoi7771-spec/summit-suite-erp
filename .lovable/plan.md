## 목표
조정선 주임(주임급)이 재고임박/유통기한임박 상품에 대해 전사 판매독려 공지를 등록할 수 있게 하고, 등록 시 ① 게시판 팝업 + ② 대시보드 위젯에 동시에 노출되도록 합니다.

## 권한 모델
- 권한 부여 대상: **조정선 주임 profile_id 1명** (Notices의 `POPUP_AUTHOR_PROFILE_IDS` 패턴과 동일하게 화이트리스트 방식)
- 추후 권한 확대 시 ID만 배열에 추가하면 됨

## 데이터 구조 (신규 테이블 `stock_urgent_alerts`)
| 필드 | 설명 |
|---|---|
| product_name | 상품명 (자유 입력 또는 products 테이블 연동 선택) |
| stock_qty | 잔여 수량 |
| expiry_date | 유통기한/소진 목표일 (nullable) |
| urgency | `high` / `medium` / `low` |
| sales_channel | 판매 채널/플랫폼 (선택) |
| incentive_note | 판매 인센티브/할인 메모 |
| message | 독려 메시지 본문 |
| status | `active` / `resolved` (소진 완료 시) |
| created_by | 작성자 profile_id |

RLS: 인증 사용자 전체 SELECT, INSERT/UPDATE/DELETE는 작성자 + CEO/총괄이사/실장 + 조정선 주임 ID.

## UI 구성

### 1. 신규 페이지 `/stock-alerts` — "재고임박 판매독려"
- 사이드바 "업무" 그룹에 메뉴 추가 (아이콘: `PackageX` 또는 `AlertTriangle`)
- 카드 리스트: 상품명, 잔여수량, D-day, urgency 뱃지, 인센티브, 작성자, 작성일
- 필터: 진행중/완료, urgency
- 권한자에게만 "독려 공지 등록" 버튼 노출
- 등록 다이얼로그 제출 시:
  1. `stock_urgent_alerts` INSERT
  2. **자동으로 `notices` 테이블에도 팝업 공지 INSERT** (제목: `[재고임박] {상품명} 판매 독려`, `show_as_popup=true`)
  3. 전 직원 알림 발송 (`notifyAllUsers`)
- 행 클릭 시 상세 + 상태 변경(완료 처리)

### 2. 대시보드 위젯 `StockUrgentWidget`
- `Dashboard.tsx` 상단 KPI 옆에 추가
- 활성 상태 alert 최대 5건 표시
- 빨간 펄스 도트 + urgency 색상, 클릭 시 `/stock-alerts` 이동
- 활성 건 0일 때 위젯 숨김

### 3. 권한 헬퍼
`src/lib/permissions.ts` (또는 inline) 에 `STOCK_ALERT_AUTHOR_PROFILE_IDS` 화이트리스트 추가.
조정선 주임 profile_id는 사용자 확인 후 또는 DB 조회로 확정.

## 알림 흐름
1. 등록 → 전체 팀 알림 ("재고임박 상품 판매 독려: {상품명}")
2. 로그인한 사용자에게 기존 `NoticePopupOnLogin` 컴포넌트가 자동 팝업 표시 (notices 연동으로 별도 작업 불필요)
3. 대시보드 위젯에 실시간 표시 (Supabase realtime 구독)

## 기술 메모
- `stock_urgent_alerts` 변경 시 `notices` 자동 동기화는 클라이언트에서 처리(트리거 미사용) — 본문 편집/취소 시에도 매핑 유지 위해 `notice_id` 컬럼 보관
- 완료 처리 시 연동된 notices 행도 자동 삭제(또는 팝업 OFF)
- 한국어 UI, Sora/Manrope/Noto Sans KR 폰트, 기존 디자인 토큰 사용
