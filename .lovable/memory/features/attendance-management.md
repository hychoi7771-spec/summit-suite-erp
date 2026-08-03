---
name: 근태관리 (휴가/연차)
description: 입사일 기반 자동 연차/월차 발생, 휴가 신청-결재-캘린더-잔액 자동 연동
type: feature
---
근태관리 시스템 (`/attendance`):
- 휴가 유형: 연차/반차/월차/여름휴가/경조사/병가(연차 차감)/기타
- **자동 발생 규칙** (`calculate_leave_grant`, `run_monthly_leave_grant`):
  - 입사 1년 미만: 월차만 발생 (매월 입사일 도래 시 1일, 최대 11일). 이 기간의 연차/반차/병가 사용분도 모두 월차에서 차감
  - 입사 1년 이상: 연차 15일/년 기준으로만 계산. 월차 적립·이월 없음(0), 해당 연도의 월차 사용분도 연차 사용일수에 합산
  - 여름휴가/경조사/기타는 차감하지 않음
- **<1년 직원 강제 변환**: handle_leave_insert_approved / handle_leave_approval 트리거가 start_date 기준 <1년이면 annual/half_day/sick → monthly 변환 (UI 우회 방지)
- profiles에 `hire_date` 저장, 관리자(대표/이사)가 직접 수정 가능
- leave_balances: total_days(연차), monthly_total_days(월차), used_days, monthly_used_days, next_grant_date
- 전자결재의 'leave' 타입 승인 → 트리거가 calendar_events 생성 + 잔액 차감
- '자동 재계산' 버튼: 모든 직원 잔액 일괄 갱신 (관리자만)
- 2026-08 기준 1년 미만자는 최하용(2026.1.12 입사)뿐, 나머지 전원 연차 기준
- 기존 시드: 이난영·공경미·조정선·이진숙·신혜교(2024.11.30), 박주원(2025.3.4), 오수경(2025.6.9), 최하용(2026.1.12)
