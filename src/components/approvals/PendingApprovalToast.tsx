import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'pending_approval_toast_shown';

/**
 * 로그인 직후, 본인이 처리해야 할 미결재 건이 있으면 별도 토스트로 알림.
 * 세션당 한 번만 노출.
 */
export function PendingApprovalToast() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const checked = useRef(false);

  useEffect(() => {
    if (!user || !profile || checked.current) return;
    checked.current = true;

    const sessionFlag = `${SESSION_KEY}:${user.id}`;
    if (sessionStorage.getItem(sessionFlag)) return;

    (async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('id, title, type')
        .eq('current_approver_id', profile.id)
        .eq('status', 'pending');

      if (error || !data || data.length === 0) return;

      sessionStorage.setItem(sessionFlag, '1');

      const count = data.length;
      const preview = data.slice(0, 2).map(a => `· ${a.title}`).join('\n');
      const more = count > 2 ? `\n외 ${count - 2}건` : '';

      toast(`결재 대기 ${count}건이 있습니다`, {
        description: `${preview}${more}`,
        icon: <FileCheck className="h-5 w-5 text-warning" />,
        duration: 10000,
        action: {
          label: '결재함 열기',
          onClick: () => navigate('/approvals?tab=pending'),
        },
        className: 'border-warning/30',
      });
    })();
  }, [user?.id, profile?.id, navigate]);

  return null;
}
