-- 1) leave_requests에 BEFORE UPDATE 트리거 연결: 승인 시 캘린더/잔액 자동 처리
DROP TRIGGER IF EXISTS trg_leave_approval ON public.leave_requests;
CREATE TRIGGER trg_leave_approval
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_leave_approval();

-- 2) leave_requests에 BEFORE INSERT 트리거 연결: 즉시 'approved'로 들어오는 경우 처리
DROP TRIGGER IF EXISTS trg_leave_insert_approved ON public.leave_requests;
CREATE TRIGGER trg_leave_insert_approved
BEFORE INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_leave_insert_approved();

-- 3) 결재(approvals) 상태가 변경되면 연결된 leave_requests의 status를 동기화
CREATE OR REPLACE FUNCTION public.sync_leave_from_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'leave' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.leave_requests
        SET status = 'approved',
            approved_by = NEW.current_approver_id,
            approved_at = COALESCE(NEW.approved_at, now())
        WHERE approval_id = NEW.id AND status <> 'approved';
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.leave_requests
        SET status = 'rejected'
        WHERE approval_id = NEW.id AND status <> 'rejected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leave_from_approval ON public.approvals;
CREATE TRIGGER trg_sync_leave_from_approval
AFTER UPDATE OF status ON public.approvals
FOR EACH ROW
EXECUTE FUNCTION public.sync_leave_from_approval();