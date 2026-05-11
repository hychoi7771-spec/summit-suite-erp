---
name: 대표 자동 전결 / 단일 결재자
description: 전자결재/휴가/경비 결재선은 대표(ceo) 단독. 대표 본인 등록 시 즉시 전결
type: feature
---
결재 규칙:
- **결재선**: 담당자 → 대표(ceo) **단독**. 총괄이사(general_director) 단계는 결재선에서 제외(2026-05-11 변경)
- **전자결재(Approvals)**: 대표가 등록 시 status='approved', current_approver_id=null, approved_at=now(), 결재 단계(approval_steps) 미생성. 그 외 사용자는 ceo 1명만 approval_steps에 생성
- **휴가신청(LeaveRequestDialog)**: ceo가 등록 시 approvals + leave_requests 모두 즉시 'approved' (handle_leave_insert_approved 트리거가 캘린더/잔액 자동 처리). 그 외 사용자는 ceo 단일 결재선
- **경비(Expenses)**: 대표 등록 시 status='Approved'로 즉시 승인
- 일반 사용자 결재 알림 대상은 ceo만
