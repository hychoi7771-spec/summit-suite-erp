---
name: 대표 자동 전결
description: 모든 결재 시스템(전자결재/경비/휴가)에서 대표(ceo)는 등록 시 즉시 자동 승인 처리
type: feature
---
대표(ceo 역할) 자동 전결 규칙:
- **전자결재(Approvals)**: 대표가 등록 시 status='approved', current_approver_id=null, approved_at=now(), 결재 단계(approval_steps) 미생성
- **휴가신청(LeaveRequestDialog)**: approvals + leave_requests 모두 즉시 'approved'로 등록 → handle_leave_insert_approved 트리거가 캘린더/잔액 자동 처리
- **경비(Expenses)**: 등록 시 status='Approved'로 즉시 승인
- 알림은 보내지 않고 "전결 완료" 토스트만 표시
- 일반 사용자는 기존 결재선(이사 → 대표) 그대로 유지
