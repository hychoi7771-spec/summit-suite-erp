---
name: 경비 관리
description: 경비 청구/승인/정산, 결제수단별 분류(개인지출/카드결제/법인계좌/기타)
type: feature
---
경비 관리(`/expenses`):
- 분류(category): 샘플링/마케팅/일반/출장/장비
- 결제수단(payment_method): personal(개인지출 정산) / card(카드결제) / corporate(법인계좌) / other
- 카드결제·법인계좌는 정산 단계 없이 기록용으로 활용
- 영수증 업로드(receipts 버킷, public)
- 상태: Pending → Approved → Reimbursed (또는 Rejected)
- 대표(ceo) 등록 시 즉시 Approved 자동 전결 (ceo-auto-approval 메모 참조)
- 승인/반려 권한: 관리자(ceo, general_director)
