import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AssetLibraryShell, { AssetCategory, AssetItem } from '@/components/assets/AssetLibraryShell';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { APPROVAL_CATEGORIES } from '@/lib/approvalCategories';

const CAT_COLORS: Record<string, string> = {
  planning_proposal: '#a855f7',
  event_proposal: '#ec4899',
  purchase_request: '#f59e0b',
  contract_request: '#3b82f6',
  business_trip: '#06b6d4',
  general_document: '#64748b',
  expense: '#10b981',
  leave: '#eab308',
};

const APPROVAL_CATS: AssetCategory[] = APPROVAL_CATEGORIES.map(c => ({
  id: c.key,
  name: c.label,
  color: CAT_COLORS[c.key] || '#64748b',
}));

export default function AssetsApprovals() {
  const nav = useNavigate();
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [appRes, profRes] = await Promise.all([
        supabase
          .from('approvals')
          .select('id,title,content,subcategory,type,requester_id,approved_at,created_at')
          .eq('status', 'approved')
          .order('approved_at', { ascending: false, nullsFirst: false })
          .limit(500),
        supabase.from('profiles').select('id,name_kr,name'),
      ]);
      const profMap = new Map((profRes.data || []).map(p => [p.id, p.name_kr || p.name]));
      const catMap = new Map(APPROVAL_CATS.map(c => [c.id, c]));
      setItems(
        (appRes.data || []).map(a => {
          const key = a.subcategory || (a.type === 'expense' ? 'expense' : a.type === 'leave' ? 'leave' : 'general_document');
          const c = catMap.get(key);
          return {
            id: a.id,
            title: a.title,
            summary: (a.content || '').slice(0, 300),
            categoryId: key,
            categoryName: c?.name || '일반',
            categoryColor: c?.color || '#64748b',
            assigneeName: a.requester_id ? profMap.get(a.requester_id) : undefined,
            completedAt: a.approved_at || a.created_at,
          };
        })
      );
      setLoading(false);
    })();
  }, []);

  return (
    <AssetLibraryShell
      source="approvals"
      title="결재문서 자산함"
      description="승인 완료된 결재 문서를 카테고리별로 모아 새 결재의 템플릿으로 활용합니다."
      categories={APPROVAL_CATS}
      items={items}
      loading={loading}
      renderActions={item => (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => nav(`/approvals?duplicate=${item.id}`)}
          >
            <Copy className="h-3 w-3" /> 복제
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => nav(`/approvals?open=${item.id}`)}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </>
      )}
    />
  );
}
