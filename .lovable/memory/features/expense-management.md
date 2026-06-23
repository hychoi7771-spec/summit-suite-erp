---
name: 경비 관리
description: 경비 청구/승인/정산, 결제수단별 정산 흐름 분리. 모든 경비는 대표 결재 필요(대표 본인 등록은 전결)
type: feature
---
경비 관리(`/expenses`):
- 분류(category): 샘플링/마케팅/일반/출장/장비
- 결제수단(payment_method) 5종:
  - `personal` 개인지출 — 본인이 현금 등으로 지불, 정산 필요
  - `personal_card` 개인카드 — 본인 카드로 지불, 정산 필요
  - `corporate_card` 법인카드 — 회사 카드 사용, 정산 단계 없음(기록용)
  - `corporate` 법인계좌 — 법인계좌 직접 출금, 정산 단계 없음(기록용)
  - `other` 기타
  - (legacy) `card` — 과거 데이터 호환용, 정산 흐름은 개인카드와 동일

상태 흐름:
- 모든 결제수단: 등록 시 Pending → 대표 승인 시 Approved (법인 결제수단도 자동 승인하지 않음, 2026-06-23 변경)
- 정산 대상(개인지출·개인카드·legacy card): Approved → Reimbursed (또는 Rejected)
- 법인 결제수단(법인카드·법인계좌): Approved 후 정산 단계 없음. 필요 시 Rejected로 변경 가능.
- 대표(ceo) 등록 시: 결제수단 무관 즉시 Approved 전결 (ceo-auto-approval 메모 참조)

영수증 업로드(receipts 버킷, public).
승인/반려 권한: 관리자(ceo, general_director).
