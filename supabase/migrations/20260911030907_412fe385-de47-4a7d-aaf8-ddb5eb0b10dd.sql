DO $$
DECLARE v_appr uuid;
BEGIN
  INSERT INTO public.approvals (title, type, content, status, requester_id, current_approver_id, approved_at, created_at, subcategory)
  VALUES ('[반차] 2026-09-11 오후 (0.5일)', 'leave', E'휴가 종류: 오후 반차\n기간: 2026-09-11 (0.5일)\n사유: 오후 반차', 'approved', 'a0d9f67c-f45c-4680-a3de-a81452e4c2b0', NULL, '2026-09-11 00:00:00+09', '2026-09-11 00:00:00+09', NULL)
  RETURNING id INTO v_appr;

  UPDATE public.leave_requests
  SET approval_id = v_appr
  WHERE id = '2ff12061-5a47-4685-b643-b0f8578312f9';
END $$;